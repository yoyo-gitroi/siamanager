import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SetupAssistant = () => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const uploadFiles = async () => {
    setStatus('uploading');
    try {
      const { data, error } = await supabase.functions.invoke('upload-files-to-assistant');
      
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Upload failed');
      }

      setStatus('success');
      toast({
        title: "Files uploaded successfully",
        description: "Your analytics data is now available to SIA assistant.",
      });
    } catch (error: any) {
      setStatus('error');
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files to OpenAI",
        variant: "destructive",
      });
    }
  };

  if (status === 'success') {
    return (
      <Card className="p-4 border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-sm">Assistant Ready</p>
            <p className="text-xs text-muted-foreground">Analytics data is connected to SIA</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Setup SIA Assistant</p>
            <p className="text-xs text-muted-foreground">Upload analytics data to enable file search</p>
          </div>
        </div>
        <Button 
          onClick={uploadFiles} 
          disabled={status === 'uploading'}
          size="sm"
        >
          {status === 'uploading' ? 'Uploading...' : 'Setup'}
        </Button>
      </div>
      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Upload failed. Please try again.</span>
        </div>
      )}
    </Card>
  );
};
