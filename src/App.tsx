import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Landing is the first thing logged-out users see, so it stays eagerly
// bundled (no extra loading flash on cold start). Everything else loads on
// demand — a user only ever needs one or two of these pages per session.
import Landing from "./pages/Landing";
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Blitz = lazy(() => import("./pages/Blitz"));
const BlitzMatch = lazy(() => import("./pages/BlitzMatch"));
const BlitzFeed = lazy(() => import("./pages/BlitzFeed"));
const Messenger = lazy(() => import("./pages/Messenger"));
const DirectChat = lazy(() => import("./pages/DirectChat"));
const Profile = lazy(() => import("./pages/Profile"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const AdminStats = lazy(() => import("./pages/AdminStats"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { getNotificationRoute } from "./lib/notificationRouting";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

function PushSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscribe, refreshLocation } = usePushNotifications();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && prevUserIdRef.current !== user.id) {
      prevUserIdRef.current = user.id;
      setTimeout(() => { subscribe(); }, 0);
    } else if (!user) {
      prevUserIdRef.current = null;
    }
  }, [user, subscribe]);

  // Tapping the OS push banner/lock-screen notification (app closed or
  // backgrounded) doesn't go through NotificationBell at all — it needs its
  // own listener to deep-link, using the same routing table.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener: (() => void) | undefined;
    import("@capacitor/push-notifications").then(({ PushNotifications }) => {
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification?.data as Record<string, any> | undefined;
        const type = data?.type;
        if (!type) return;
        const route = getNotificationRoute(type, data);
        if (route) navigate(route.path, route.state ? { state: route.state } : undefined);
      }).then((handle) => {
        removeListener = () => handle.remove();
      });
    });
    return () => removeListener?.();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshLocation();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let removeCapListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App: CapApp }) => {
        CapApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) refreshLocation();
        }).then((handle) => {
          removeCapListener = () => handle.remove();
        });
      });
    }
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      removeCapListener?.();
    };
  }, [user, refreshLocation]);

  return null;
}

/** Root route: logged-out → Landing, logged-in without onboarding → /onboarding, else /blitz. */
function RootRoute() {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setChecking(false); setOnboarded(null); return; }
    setChecking(true);
    (async () => {
      const { data } = await (await import("@/integrations/supabase/client")).supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle() as any;
      if (cancelled) return;
      setOnboarded(!!data?.onboarding_completed);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checking) return <div className="min-h-screen bg-[hsl(var(--blitz-forest))]" />;
  if (!user) return <Landing />;
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/blitz" replace />;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--blitz-forest))]" />}>
              <PushSetup />
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/blitz" element={<Blitz />} />
                <Route path="/blitz/match/:matchId" element={<BlitzMatch />} />
                <Route path="/feed" element={<BlitzFeed />} />
                <Route path="/messenger" element={<Messenger />} />
                <Route path="/dm/:conversationId" element={<DirectChat />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/admin" element={<AdminStats />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/user/:userId" element={<UserProfile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
