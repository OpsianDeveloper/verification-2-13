import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Verify from "./pages/Verify";
import Admin from "./pages/Admin";
import StaffDashboard from "./pages/StaffDashboard";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DataRetention from "./pages/DataRetention";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/verify/:token" element={<Verify />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/staff-dashboard" element={<StaffDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/data-retention" element={<DataRetention />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
