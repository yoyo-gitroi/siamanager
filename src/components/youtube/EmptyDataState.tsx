import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyDataStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onAction?: () => void;
}

export const EmptyDataState = ({
  title,
  description,
  actionText = "Run Backfill",
  actionLink = "/youtube-setup",
  onAction,
}: EmptyDataStateProps) => {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Database className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>

        <div className="flex gap-3">
          {onAction ? (
            <Button onClick={onAction}>{actionText}</Button>
          ) : (
            <Link to={actionLink}>
              <Button>{actionText}</Button>
            </Link>
          )}
        </div>

        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md w-full">
          <div className="flex items-start gap-2 text-left">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              After connecting your YouTube account, run the backfill to import historical analytics data.
              This process may take several minutes depending on your channel size.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};