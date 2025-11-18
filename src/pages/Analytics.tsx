import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Youtube, Instagram } from "lucide-react";
import YouTubeDataView from "./YouTubeDataView";
import InstagramAnalytics from "./InstagramAnalytics";

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive insights across all your platforms
        </p>
      </div>

      <Tabs defaultValue="youtube" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4" />
            YouTube
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Instagram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="youtube" className="mt-6">
          <YouTubeDataView />
        </TabsContent>

        <TabsContent value="instagram" className="mt-6">
          <InstagramAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
