import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, FileText, Image, BookOpen, Hash, Wand2, ImagePlay, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

const contentAgents = [
  {
    id: "klipper",
    title: "Klipper Agent",
    description: "Long format Videos to Reels/Shorts of 30-45 secs",
    details: "With only input as Video url",
    icon: Video,
    available: true,
  },
  {
    id: "text-content",
    title: "Text Content Generator",
    description: "Creates Content for LinkedIn, X",
    details: "Based on User's Profile",
    icon: FileText,
    available: false,
  },
  {
    id: "image-suggestor",
    title: "Image Suggestor/Image Content",
    description: "Suggest Images for the LinkedIn and X posts if User Agrees",
    details: "Also Generates Images for Instagram",
    icon: Image,
    available: false,
  },
  {
    id: "newsletter",
    title: "Newsletter/Blog Creator Agent",
    description: "Creating Newsletter that drives Revenue",
    details: "Army of Art Sub Agents from Research to Curating Content",
    icon: BookOpen,
    available: false,
  },
  {
    id: "caption-hashtag",
    title: "Caption & Hashtag Generator",
    description: "Generate platform-specific captions using GPT models",
    details: "With tone presets",
    icon: Hash,
    available: false,
  },
  {
    id: "ai-video",
    title: "AI Video Generator",
    description: "Creating platform-optimized content",
    details: "Faceless AI Videos",
    icon: Wand2,
    available: false,
  },
  {
    id: "thumbnail",
    title: "Thumbnail Generator",
    description: "Generates Thumbnail that Actually work",
    details: "Youtube Ecosystem and Bring results",
    icon: ImagePlay,
    available: false,
  },
  {
    id: "avatar-agent",
    title: "Avatar Agent-Content Creator",
    description: "Creating platform-optimized Content",
    details: "As User's Video Avatar",
    icon: Bot,
    available: false,
  },
];

const Content = () => {
  const navigate = useNavigate();

  const handleLaunchAgent = (agentId: string) => {
    if (agentId === "klipper") {
      navigate("/klipper-agent");
    }
    // Add navigation for other agents when they become available
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="max-w-3xl">
        <h1 className="mb-3">Create</h1>
        <p className="text-muted-foreground text-lg">
          AI-powered content generation tools for all platforms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
        {contentAgents.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card 
              key={agent.id} 
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Content Generation
                    </p>
                    <h3 className="font-semibold text-lg leading-tight mb-1">
                      {agent.title}
                    </h3>
                  </div>
                </div>
                
                <div className="space-y-2 min-h-[80px]">
                  <p className="text-sm text-foreground leading-relaxed">
                    {agent.description}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {agent.details}
                  </p>
                </div>

                <Button 
                  className="w-full mt-4" 
                  variant={agent.available ? "default" : "outline"}
                  disabled={!agent.available}
                  size="lg"
                  onClick={() => handleLaunchAgent(agent.id)}
                >
                  Launch Agent
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Content;
