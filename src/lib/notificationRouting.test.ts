import { describe, it, expect } from "vitest";
import { getNotificationRoute } from "./notificationRouting";

describe("getNotificationRoute", () => {
  it("routes a new DM to its conversation", () => {
    expect(getNotificationRoute("new_dm", { conversation_id: "c1" })).toEqual({ path: "/dm/c1" });
  });

  it("returns null for a new DM with no conversation id", () => {
    expect(getNotificationRoute("new_dm", {})).toBeNull();
    expect(getNotificationRoute("new_dm", null)).toBeNull();
  });

  it("routes blitz match/chat/accepted notifications to the huddle", () => {
    for (const type of ["blitz_match", "blitz_chat_message", "blitz_accepted"]) {
      expect(getNotificationRoute(type, { match_id: "m1" })).toEqual({ path: "/blitz/match/m1" });
    }
  });

  it("routes a blitz request to the incoming-requests tab", () => {
    expect(getNotificationRoute("blitz_request", {})).toEqual({
      path: "/blitz",
      state: { tab: "request" },
    });
  });

  it("routes new_blitz_nearby and ritual_push to the discover tab", () => {
    expect(getNotificationRoute("new_blitz_nearby", {})).toEqual({
      path: "/blitz",
      state: { tab: "discover" },
    });
    expect(getNotificationRoute("ritual_push", {})).toEqual({
      path: "/blitz",
      state: { tab: "discover" },
    });
  });

  it("routes a recap prompt to the feed with the match preselected", () => {
    expect(getNotificationRoute("blitz_recap_prompt", { match_id: "m1" })).toEqual({
      path: "/feed",
      state: { composeMatchId: "m1" },
    });
  });

  it("falls back to the plain feed if a recap prompt has no match id", () => {
    expect(getNotificationRoute("blitz_recap_prompt", {})).toEqual({ path: "/feed" });
  });

  it("routes feed like/comment/mention/tag notifications to the feed", () => {
    for (const type of ["feed_post_like", "feed_post_comment", "feed_comment_mention", "feed_post_tag"]) {
      expect(getNotificationRoute(type, {})).toEqual({ path: "/feed" });
    }
  });

  it("falls back to a friend's profile for friend_request/friend_accepted", () => {
    expect(getNotificationRoute("friend_request", { from_user_id: "u1" })).toEqual({ path: "/user/u1" });
    expect(getNotificationRoute("friend_request", {})).toEqual({ path: "/profile" });
    expect(getNotificationRoute("friend_accepted", { friend_id: "u2" })).toEqual({ path: "/user/u2" });
    expect(getNotificationRoute("friend_accepted", {})).toBeNull();
  });

  it("returns null for an unknown notification type", () => {
    expect(getNotificationRoute("something_new", { foo: "bar" })).toBeNull();
  });
});
