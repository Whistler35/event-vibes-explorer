import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "evendle_session_id";
const LAST_PATH_KEY = "evendle_last_tracked_path";

const getSessionId = (): string => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

export const useTrackVisit = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    // Avoid logging duplicates within the same session render
    const last = sessionStorage.getItem(LAST_PATH_KEY);
    if (last === path) return;
    sessionStorage.setItem(LAST_PATH_KEY, path);

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        await supabase.from("site_visits").insert({
          visitor_id: auth.user?.id ?? null,
          session_id: getSessionId(),
          path,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch {
        // silent fail – tracking should never break the app
      }
    })();
  }, [location.pathname]);
};

const VisitTracker = () => {
  useTrackVisit();
  return null;
};

export default VisitTracker;
