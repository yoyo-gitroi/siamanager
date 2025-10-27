import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Scissors, Calendar, Send, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const ContentWorkflow = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [clipCount, setClipCount] = useState([3]);
  const [clipLength, setClipLength] = useState([20]);
  const [layout, setLayout] = useState("full");

  const handleVideoAnalysis = () => {
    if (!videoUrl) {
      toast.error("Please enter a video URL");
      return;
    }
    toast.success("Video analysis started");
  };

  const handleGenerateShorts = () => {
    toast.success(`Generating ${clipCount[0]} shorts with ${clipLength[0]}s length`);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Content Workflow</h1>
        <p className="text-muted-foreground">
          Analyze videos, generate shorts, and schedule posts across platforms
        </p>
      </div>

      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze">
            <Video className="h-4 w-4 mr-2" />
            Analyze
          </TabsTrigger>
          <TabsTrigger value="shorts">
            <Scissors className="h-4 w-4 mr-2" />
            Shorts
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="publish">
            <Send className="h-4 w-4 mr-2" />
            Publish
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze">
          <Card className="p-6">
            <h2 className="mb-4">Video Analysis</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL or Upload</Label>
                <div className="flex gap-2">
                  <Input
                    id="video-url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleVideoAnalysis} className="w-full">
                <Video className="h-4 w-4 mr-2" />
                Analyze Video
              </Button>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Analysis Results</h3>
                <p className="text-sm text-muted-foreground">
                  Upload or paste a video URL to start analysis
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="shorts">
          <Card className="p-6">
            <h2 className="mb-4">Generate Shorts</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Number of Clips (1-10)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={clipCount}
                    onValueChange={setClipCount}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-8">{clipCount[0]}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Clip Length (10-60s)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={clipLength}
                    onValueChange={setClipLength}
                    min={10}
                    max={60}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12">{clipLength[0]}s</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Layout Style</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Screen</SelectItem>
                    <SelectItem value="split">Split Screen</SelectItem>
                    <SelectItem value="broll">With B-Roll</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleGenerateShorts} className="w-full">
                <Scissors className="h-4 w-4 mr-2" />
                Generate Shorts
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="p-6">
            <h2 className="mb-4">Schedule Posts</h2>
            <p className="text-muted-foreground">
              Calendar view for scheduling content across platforms
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="publish">
          <Card className="p-6">
            <h2 className="mb-4">Multi-Account Publishing</h2>
            <p className="text-muted-foreground">
              Publish unique content to multiple social accounts
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentWorkflow;
