import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import EventDetail from "./pages/EventDetail";
import EventHangouts from "./pages/EventHangouts";
import Nearby from "./pages/Nearby";
import EventChatPage from "./pages/EventChatPage";
import Messenger from "./pages/Messenger";
import DirectChat from "./pages/DirectChat";
import EvenldeWelcomeChat from "./pages/EvenldeWelcomeChat";
import Blitz from "./pages/Blitz";
import BlitzMatch from "./pages/BlitzMatch";
import Tickets from "./pages/Tickets";
import EventCheckin from "./pages/EventCheckin";

import Chat from "./pages/Chat";
import CityEvents from "./pages/CityEvents";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import VisitTracker from "./hooks/useTrackVisit";

const AdminEvents = lazy(() => import("./pages/AdminEvents"));
const HostDashboard = lazy(() => import("./pages/HostDashboard"));
const HostStats = lazy(() => import("./pages/HostStats"));
const HostBilling = lazy(() => import("./pages/HostBilling"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/city/:city" element={<CityEvents />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/event/:id/hangouts" element={<EventHangouts />} />
              <Route path="/event/:id/chat" element={<EventChatPage />} />
              <Route path="/event/:id/checkin" element={<EventCheckin />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/nearby" element={<Nearby />} />
              <Route path="/blitz" element={<Blitz />} />
              <Route path="/blitz/match/:matchId" element={<BlitzMatch />} />
              <Route path="/messenger" element={<Messenger />} />
              <Route path="/dm/evendle-welcome" element={<EvenldeWelcomeChat />} />
              <Route path="/dm/:conversationId" element={<DirectChat />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/host/dashboard" element={<HostDashboard />} />
              <Route path="/host/stats" element={<HostStats />} />
              <Route path="/host/billing" element={<HostBilling />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
