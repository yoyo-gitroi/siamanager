import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";

const Publishing = () => {
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Publishing</h1>
        <p className="text-muted-foreground">
          Schedule and manage your content publishing calendar
        </p>
      </div>

      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="mb-2">Publishing Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Schedule content across platforms
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Get Best Slots
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">
            Publishing calendar will be displayed here
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Publishing;
