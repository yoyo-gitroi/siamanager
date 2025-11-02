import { useState, useEffect } from "react";
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

const WEBHOOK_URL = "https://n8n.srv1063704.hstgr.cloud/webhook/3c977b71-2d42-449f-b56b-f4b1aeb2f13f";
const GENERATION_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
const STORAGE_KEY = "klipper_generation_state";

const KlipperAgent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [videoUrl, setVideoUrl] = useState("");
  const [numberOfShorts, setNumberOfShorts] = useState([3]);
  const [avgVideoTime, setAvgVideoTime] = useState([45]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Load generation state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const { endTime } = JSON.parse(savedState);
      const remaining = endTime - Date.now();
      
      if (remaining > 0) {
        setIsGenerating(true);
        setRemainingTime(remaining);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Update remaining time every second
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { endTime } = JSON.parse(savedState);
        const remaining = endTime - Date.now();
        
        if (remaining <= 0) {
          setIsGenerating(false);
          setRemainingTime(0);
          localStorage.removeItem(STORAGE_KEY);
          toast.success("Video generation completed!");
        } else {
          setRemainingTime(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate shorts");
      return;
    }

    if (!videoUrl) {
      toast.error("Please enter a video URL");
      return;
    }

    try {
      setIsGenerating(true);
      
      // Set end time and save to localStorage
      const endTime = Date.now() + GENERATION_TIME;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime }));
      setRemainingTime(GENERATION_TIME);

      // Send to webhook
      const payload = {
        videoUrl,
        numberOfShorts: numberOfShorts[0],
        avgVideoTime: avgVideoTime[0],
        userId: user.id,
        userEmail: user.email
      };

      const webhookResponse = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        throw new Error("Failed to send to webhook");
      }

      // Log to database
      const { error: logError } = await supabase
        .from("shorts_generation_logs")
        .insert({
          user_id: user.id,
          user_email: user.email || "",
          video_url: videoUrl,
          number_of_shorts: numberOfShorts[0],
          avg_video_time: avgVideoTime[0],
        });

      if (logError) {
        console.error("Failed to log generation:", logError);
      }

      toast.success("Shorts generation started! This will take 5-10 minutes.");
    } catch (error) {
      console.error("Error generating shorts:", error);
      toast.error("Failed to start generation. Please try again.");
      setIsGenerating(false);
      localStorage.removeItem(STORAGE_KEY);
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
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="h-12 text-base"
            />
            <p className="text-sm text-muted-foreground">
              Paste the URL of the long-format video you want to convert
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
                Generating... {formatTime(remainingTime)}
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
