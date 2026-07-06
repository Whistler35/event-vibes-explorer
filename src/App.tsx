import { Suspense, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Blitz from "./pages/Blitz";
import BlitzMatch from "./pages/BlitzMatch";
import Messenger from "./pages/Messenger";
import DirectChat from "./pages/DirectChat";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";
import NotFound from "./pages/NotFound";
import { Capacitor } from "@capacitor/core";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { usePushNotifications } from "./hooks/usePushNotifications";

const queryClient = new QueryClient();

function PushSetup() {
  const { user } = useAuth();
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

/** Root route: logged-out → Snapchat-style Landing, logged-in → straight into Blitz. */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[hsl(var(--blitz-forest))]" />;
  if (!user) return <Landing />;
  return <Navigate to="/blitz" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <PushSetup />
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/blitz" element={<Blitz />} />
              <Route path="/blitz/match/:matchId" element={<BlitzMatch />} />
              <Route path="/messenger" element={<Messenger />} />
              <Route path="/dm/:conversationId" element={<DirectChat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
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
);

export default App;
