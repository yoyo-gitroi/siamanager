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
import YouTubeSetup from "./pages/YouTubeSetup";
import YouTubeDataView from "./pages/YouTubeDataView";
import OAuthCallback from "./pages/OAuthCallbackHandler";
import OAuthRedirect from "./pages/OAuthRedirect";
import NotFound from "./pages/NotFound";
import KlipperAgent from "./pages/KlipperAgent";
import ShortsLogs from "./pages/ShortsLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/oauth-redirect" element={<OAuthRedirect />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="analytics" element={<UnifiedAnalytics />} />
            <Route path="create" element={<Content />} />
            <Route path="klipper-agent" element={<KlipperAgent />} />
            <Route path="shorts-logs" element={<ShortsLogs />} />
            <Route path="post" element={<Publishing />} />
            <Route path="engage" element={<Engagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
