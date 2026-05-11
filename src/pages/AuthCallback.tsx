import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorDescription =
          url.searchParams.get("error_description") || url.searchParams.get("error");

        if (errorDescription) {
          console.error("[AuthCallback] OAuth error:", errorDescription);
          navigate(`/auth?error=${encodeURIComponent(errorDescription)}`, { replace: true });
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[AuthCallback] exchangeCodeForSession failed:", error);
            navigate(`/auth?error=${encodeURIComponent(error.message)}`, { replace: true });
            return;
          }
        } else if (url.hash.includes("access_token")) {
          // Implicit flow: supabase-js picks up the hash automatically via detectSessionInUrl
          await new Promise((r) => setTimeout(r, 100));
        }

        navigate("/", { replace: true });
      } catch (e) {
        console.error("[AuthCallback] unexpected error:", e);
        navigate("/auth", { replace: true });
      }
    };
    run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Anmeldung wird abgeschlossen…</p>
    </div>
  );
};

export default AuthCallback;
