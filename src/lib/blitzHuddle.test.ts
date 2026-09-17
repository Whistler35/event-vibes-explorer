import { describe, it, expect } from "vitest";
import { isHuddleActive } from "./blitzHuddle";

describe("isHuddleActive", () => {
  const now = new Date("2026-01-01T12:00:00Z").getTime();

  it("is false for null/undefined", () => {
    expect(isHuddleActive(null, now)).toBe(false);
    expect(isHuddleActive(undefined, now)).toBe(false);
  });

  it("is false when status is present and not 'active'", () => {
    expect(isHuddleActive({ status: "expired", chat_expires_at: "2026-01-01T13:00:00Z" }, now)).toBe(false);
    expect(isHuddleActive({ status: "cancelled", expires_at: "2026-01-01T13:00:00Z" }, now)).toBe(false);
  });

  it("is false when neither expiry field is set", () => {
    expect(isHuddleActive({ status: "active" }, now)).toBe(false);
  });

  it("prefers chat_expires_at over expires_at when both are present", () => {
    expect(
      isHuddleActive(
        { chat_expires_at: "2026-01-01T11:00:00Z", expires_at: "2026-01-01T13:00:00Z" },
        now
      )
    ).toBe(false); // chat_expires_at already passed, even though expires_at hasn't
  });

  it("is true for a future expiry with active/absent status", () => {
    expect(isHuddleActive({ status: "active", chat_expires_at: "2026-01-01T13:00:00Z" }, now)).toBe(true);
    expect(isHuddleActive({ expires_at: "2026-01-01T13:00:00Z" }, now)).toBe(true);
  });

  it("is false once the expiry has passed", () => {
    expect(isHuddleActive({ chat_expires_at: "2026-01-01T11:59:59Z" }, now)).toBe(false);
  });
});
