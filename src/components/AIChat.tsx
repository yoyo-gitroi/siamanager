import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const AIChat = () => {
  return (
    <Card className="p-6 rounded-2xl shadow-lg border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <h3 className="font-semibold">AI Insights Assistant</h3>
      </div>

      <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-muted">
        <iframe
          src="https://chatgpt.com/g/g-68f02b41ed888191b419291fb6f77cee-sia-social-insights-avatar"
          className="w-full h-full border-0"
          title="SIA - Social Insights Avatar"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      <p className="text-sm text-muted-foreground mt-4">
        Ask questions about your social media data, get insights, and receive
        actionable recommendations powered by your custom GPT assistant.
      </p>
      <a
        href="https://chatgpt.com/g/g-68f02b41ed888191b419291fb6f77cee-sia-social-insights-avatar"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline block mt-2"
      >
        Open in ChatGPT →
      </a>
    </Card>
  );
};

export default AIChat;
