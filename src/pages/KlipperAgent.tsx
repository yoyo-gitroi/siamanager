import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Video, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Client-side validation schema
const videoUrlSchema = z.string()
  .trim()
  .min(1, "Video URL is required")
  .max(500, { message: "URL is too long" })
  .url({ message: "Must be a valid URL" })
  .refine((url) => {
    try {
      const parsed = new URL(url);
      
      // Only HTTPS allowed
      if (parsed.protocol !== 'https:') {
        return false;
      }
      
      // Whitelist YouTube and Google Drive domains
      const allowedDomains = [
        'youtube.com',
        'youtu.be',
        'm.youtube.com',
        'www.youtube.com',
        'drive.google.com',
        'docs.google.com'
      ];
      
      return allowedDomains.some(domain => 
        parsed.hostname === domain || 
        parsed.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }, { 
    message: "URL must be from YouTube or Google Drive" 
  });

const KlipperAgent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState("");
  const [numberOfShorts, setNumberOfShorts] = useState([3]);
  const [avgVideoTime, setAvgVideoTime] = useState([45]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate shorts");
      return;
    }

    // Validate video URL
    const validation = videoUrlSchema.safeParse(videoUrl);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      setIsGenerating(true);

      // Call edge function instead of direct webhook
      const { data, error } = await supabase.functions.invoke('generate-klipper-shorts', {
        body: {
          videoUrl: validation.data,
          numberOfShorts: numberOfShorts[0],
          avgVideoTime: avgVideoTime[0],
        }
      });

      if (error) {
        throw error;
      }

      toast.success("Shorts generation started successfully!");
      setVideoUrl(""); // Clear the form
      setIsGenerating(false);
    } catch (error: any) {
      console.error("Error generating shorts:", error);
      toast.error(error.message || "Failed to start generation. Please try again.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/create")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-3">Klipper Agent</h1>
          <p className="text-muted-foreground text-lg">
            Transform long-format videos into engaging 30-45 second Reels/Shorts
          </p>
        </div>
      </div>

      <Card className="p-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 rounded-xl bg-primary/10">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Generate Shorts</h2>
            <p className="text-muted-foreground">
              Enter your video URL and configure generation settings
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Video URL Input */}
          <div className="space-y-3">
            <Label htmlFor="video-url" className="text-base font-medium">
              Video URL
            </Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://youtube.com/watch?v=... or https://drive.google.com/file/d/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="h-12 text-base"
            />
            <p className="text-sm text-muted-foreground">
              Paste the URL of your video from YouTube or Google Drive
            </p>
          </div>

          {/* Number of Shorts Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Number of Shorts
              </Label>
              <span className="text-2xl font-semibold text-primary">
                {numberOfShorts[0]}
              </span>
            </div>
            <Slider
              value={numberOfShorts}
              onValueChange={setNumberOfShorts}
              min={1}
              max={10}
              step={1}
              className="py-4"
            />
            <p className="text-sm text-muted-foreground">
              Choose how many short clips to generate from your video
            </p>
          </div>

          {/* Average Video Time Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Average Short Duration
              </Label>
              <span className="text-2xl font-semibold text-primary">
                {avgVideoTime[0]}s
              </span>
            </div>
            <Slider
              value={avgVideoTime}
              onValueChange={setAvgVideoTime}
              min={15}
              max={60}
              step={5}
              className="py-4"
            />
            <p className="text-sm text-muted-foreground">
              Set the target duration for each generated short (15-60 seconds)
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!videoUrl || isGenerating}
            size="lg"
            className="w-full h-14 text-base font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Shorts"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default KlipperAgent;
