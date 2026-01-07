import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import EventHangouts from "./pages/EventHangouts";
import Nearby from "./pages/Nearby";
import Messenger from "./pages/Messenger";
import Chat from "./pages/Chat";
import CityEvents from "./pages/CityEvents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/city/:city" element={<CityEvents />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/event/:id/hangouts" element={<EventHangouts />} />
          <Route path="/nearby" element={<Nearby />} />
          <Route path="/messenger" element={<Messenger />} />
          <Route path="/chat/:id" element={<Chat />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
