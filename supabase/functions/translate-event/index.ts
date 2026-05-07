import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function md5(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_id, target_language } = await req.json();
    if (!event_id || !["de", "en"].includes(target_language)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: event, error: evErr } = await admin
      .from("events")
      .select("id, description")
      .eq("id", event_id)
      .maybeSingle();

    if (evErr || !event) {
      return new Response(JSON.stringify({ error: "event_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const original = (event.description || "").trim();
    if (!original) {
      return new Response(JSON.stringify({ description: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await md5(original);

    // Check cache
    const { data: cached } = await admin
      .from("event_translations")
      .select("description, source_hash")
      .eq("event_id", event_id)
      .eq("language", target_language)
      .maybeSingle();

    if (cached && cached.source_hash === hash) {
      return new Response(JSON.stringify({ description: cached.description, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Translate via Lovable AI
    const targetLabel = target_language === "de" ? "German (de)" : "English (en)";
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a precise translator for an events platform. Translate the user text to the requested language. Keep tone, formatting, line breaks, emojis, hashtags, and URLs. Do NOT translate proper nouns, brand names, or place names. Output ONLY the translated text — no quotes, no explanations, no preface. If the text is already in the target language, return it unchanged.",
          },
          {
            role: "user",
            content: `Target language: ${targetLabel}\n\nText:\n${original}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, txt);
      return new Response(JSON.stringify({ description: original, error: "ai_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const translated: string =
      aiJson?.choices?.[0]?.message?.content?.trim() || original;

    await admin.from("event_translations").upsert(
      {
        event_id,
        language: target_language,
        description: translated,
        source_hash: hash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,language" },
    );

    return new Response(JSON.stringify({ description: translated, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-event error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
