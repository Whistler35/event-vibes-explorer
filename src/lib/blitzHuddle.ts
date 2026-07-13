/**
 * Central visibility logic for Blitz huddles / requests.
 * A huddle stays visible while its expiration timestamp is in the future.
 */
export const isHuddleActive = (
  entity: { chat_expires_at?: string | null; expires_at?: string | null; status?: string | null } | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!entity) return false;
  if (entity.status && entity.status !== "active") return false;
  const target = entity.chat_expires_at ?? entity.expires_at;
  if (!target) return false;
  return new Date(target).getTime() > now;
};
