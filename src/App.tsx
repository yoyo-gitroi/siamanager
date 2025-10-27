import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import UnifiedAnalytics from "./pages/UnifiedAnalytics";
import GrowthInsights from "./pages/GrowthInsights";
import Content from "./pages/Content";
import Publishing from "./pages/Publishing";
import Engagement from "./pages/Engagement";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MatrixAnalytics from "./pages/MatrixAnalytics";
import ContentWorkflow from "./pages/ContentWorkflow";
import GuestOutreach from "./pages/GuestOutreach";
import ThumbnailTests from "./pages/ThumbnailTests";

const queryClient = new QueryClient();

// Main App component with all routes
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="analytics" element={<UnifiedAnalytics />} />
            <Route path="growth" element={<GrowthInsights />} />
            <Route path="content" element={<Content />} />
            <Route path="publishing" element={<Publishing />} />
            <Route path="engagement" element={<Engagement />} />
            <Route path="settings" element={<Settings />} />
            <Route path="matrix" element={<MatrixAnalytics />} />
            <Route path="workflow" element={<ContentWorkflow />} />
            <Route path="guests" element={<GuestOutreach />} />
            <Route path="youtube/ab-tests" element={<ThumbnailTests />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
