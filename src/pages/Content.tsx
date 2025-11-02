import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, FileText, Image, BookOpen, Hash, Wand2, ImagePlay, Bot } from "lucide-react";

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
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Create</h1>
        <p className="text-muted-foreground">
          AI-powered content generation tools for all platforms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentAgents.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card key={agent.id} className="p-6 hover:shadow-lg transition-shadow relative">
              {!agent.available && (
                <Badge className="absolute top-4 right-4" variant="secondary">
                  Coming Soon
                </Badge>
              )}
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Content Generation</p>
                    <h3 className="font-semibold mb-2">{agent.title}</h3>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{agent.description}</p>
                  <p className="text-xs text-muted-foreground">{agent.details}</p>
                </div>

                <Button 
                  className="w-full" 
                  variant={agent.available ? "default" : "outline"}
                  disabled={!agent.available}
                >
                  {agent.available ? "Launch Agent" : "Coming Soon"}
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
