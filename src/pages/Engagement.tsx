import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Play, Users } from "lucide-react";

const Engagement = () => {
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Engagement</h1>
        <p className="text-muted-foreground">
          Manage interactions and run engagement agents
        </p>
      </div>

      <Card className="p-8">
        <div className="mb-6">
          <h2 className="mb-2">Unified Inbox</h2>
          <p className="text-sm text-muted-foreground">
            Coming soon - manage all platform interactions in one place
          </p>
        </div>

        <div className="flex items-center justify-center py-24 text-center">
          <div className="space-y-4">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Engagement tools will be displayed here
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Guest Suggestor
              </Button>
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Topic Suggestor
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Engagement;
