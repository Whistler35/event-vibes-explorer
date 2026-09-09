import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Block / unblock
// ─────────────────────────────────────────────────────────────────────────────

export async function blockUser(targetUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");
  if (user.id === targetUserId) throw new Error("Du kannst dich nicht selbst blockieren");

  const { error } = await supabase
    .from("blocked_users" as any)
    .insert({ blocker_id: user.id, blocked_id: targetUserId } as any);

  // Ignore "already blocked" (unique violation)
  if (error && !/(duplicate|unique)/i.test(error.message)) throw error;
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { error } = await supabase
    .from("blocked_users" as any)
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId);
  if (error) throw error;
}

/** True if the current user has blocked `targetUserId`. */
export async function hasBlocked(targetUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("blocked_users" as any)
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId)
    .maybeSingle();
  return !!data;
}

/**
 * All user IDs the current user can't interact with — people they blocked
 * AND people who blocked them. Use to filter discovery / lists client-side.
 */
export async function getBlockedIds(): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const [{ data: iBlocked }, { data: blockedMe }] = await Promise.all([
    supabase.from("blocked_users" as any).select("blocked_id").eq("blocker_id", user.id),
    supabase.from("blocked_users" as any).select("blocker_id").eq("blocked_id", user.id),
  ]);

  const ids = new Set<string>();
  (iBlocked ?? []).forEach((r: any) => ids.add(r.blocked_id));
  (blockedMe ?? []).forEach((r: any) => ids.add(r.blocker_id));
  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────

export type ReportReason = "spam" | "harassment" | "inappropriate" | "fake" | "other";
export type ReportContext = "profile" | "direct_message" | "blitz";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "harassment", label: "Belästigung oder Mobbing" },
  { value: "inappropriate", label: "Anstößige oder unangemessene Inhalte" },
  { value: "spam", label: "Spam oder Werbung" },
  { value: "fake", label: "Fake-Profil / Betrug" },
  { value: "other", label: "Etwas anderes" },
];

export async function submitReport(params: {
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  context?: ReportContext;
  reportedMessageId?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { error } = await supabase.from("reports" as any).insert({
    reporter_id: user.id,
    reported_user_id: params.reportedUserId,
    reported_message_id: params.reportedMessageId ?? null,
    context: params.context ?? "profile",
    reason: params.reason,
    details: params.details?.trim() || null,
  } as any);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete account
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permanently deletes the current user's account and their data, then signs out.
 * Backed by the `delete_own_account` Postgres function (SECURITY DEFINER).
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_own_account" as any);
  if (error) throw error;
  await supabase.auth.signOut();
}
