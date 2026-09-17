// Shared "where does tapping this notification go" logic — used by both the
// in-app NotificationBell (tap a row) and the native push-tap handler (tap
// the OS notification banner while the app is closed/backgrounded). Keeping
// this in one place means both paths always agree.

export interface NotificationRouteTarget {
  path: string;
  state?: Record<string, unknown>;
}

export function getNotificationRoute(
  type: string,
  data: Record<string, any> | null | undefined
): NotificationRouteTarget | null {
  const d = data ?? {};

  switch (type) {
    case "new_dm":
      return d.conversation_id ? { path: `/dm/${d.conversation_id}` } : null;

    case "friend_request": {
      const uid = d.from_user_id || d.requester_id || d.friend_id;
      return { path: uid ? `/user/${uid}` : "/profile" };
    }

    case "friend_accepted": {
      const uid = d.friend_id || d.from_user_id || d.requester_id;
      return uid ? { path: `/user/${uid}` } : null;
    }

    case "blitz_match":
    case "blitz_chat_message":
    case "blitz_accepted":
      return d.match_id ? { path: `/blitz/match/${d.match_id}` } : null;

    case "blitz_request":
      // Host lands on the incoming-requests list on "Mein Blitz" to accept/decline.
      return { path: "/blitz", state: { tab: "request" } };

    case "new_blitz_nearby":
    case "ritual_push":
      return { path: "/blitz", state: { tab: "discover" } };

    case "blitz_recap_prompt":
      return d.match_id ? { path: "/feed", state: { composeMatchId: d.match_id } } : { path: "/feed" };

    case "feed_post_like":
    case "feed_post_comment":
    case "feed_comment_mention":
    case "feed_post_tag":
      return { path: "/feed" };

    default:
      return null;
  }
}
