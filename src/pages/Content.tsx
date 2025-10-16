import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Send } from "lucide-react";

const Content = () => {
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Content</h1>
        <p className="text-muted-foreground">
          Manage your processed clips and trigger content agents
        </p>
      </div>

      <Card className="p-8">
        <div className="mb-6">
          <h2 className="mb-2">Processed Clips</h2>
          <p className="text-sm text-muted-foreground">
            View and manage your content library
          </p>
        </div>

        <div className="flex items-center justify-center py-24 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Content management interface will be displayed here
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Run Link→Shorts
              </Button>
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Run ReelConverter
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Content;
