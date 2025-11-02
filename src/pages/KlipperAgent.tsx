import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Video, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const KlipperAgent = () => {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState("");
  const [numberOfShorts, setNumberOfShorts] = useState([3]);
  const [avgVideoTime, setAvgVideoTime] = useState([45]);

  const handleGenerate = () => {
    console.log({
      videoUrl,
      numberOfShorts: numberOfShorts[0],
      avgVideoTime: avgVideoTime[0]
    });
    // TODO: Implement generation logic
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
            disabled={!videoUrl}
            size="lg"
            className="w-full h-14 text-base font-semibold"
          >
            Generate Shorts
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default KlipperAgent;
