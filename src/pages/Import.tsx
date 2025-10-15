import { useState } from "react";
import { Upload, CheckCircle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Import = () => {
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [youtubeFile, setYoutubeFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    platform: "linkedin" | "youtube"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type", {
          description: "Please upload a CSV or Excel file",
        });
        return;
      }

      if (platform === "linkedin") {
        setLinkedinFile(file);
      } else {
        setYoutubeFile(file);
      }

      toast.success("File selected", {
        description: `${file.name} is ready to import`,
      });
    }
  };

  const handleImport = async () => {
    if (!linkedinFile && !youtubeFile) {
      toast.error("No files selected", {
        description: "Please select at least one file to import",
      });
      return;
    }

    setImporting(true);

    // Simulate import processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.success("Data imported successfully", {
      description: "Your analytics data is now available in the dashboard",
    });

    setImporting(false);
    navigate("/");
  };

  const FileUploadCard = ({
    platform,
    file,
    onFileChange,
    expectedColumns,
  }: {
    platform: "linkedin" | "youtube";
    file: File | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    expectedColumns: string[];
  }) => (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1 capitalize">{platform} Analytics</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your {platform} CSV or Excel file
          </p>

          <div className="mb-4">
            <p className="text-xs font-medium mb-2">Expected columns:</p>
            <div className="flex flex-wrap gap-2">
              {expectedColumns.map((col) => (
                <span
                  key={col}
                  className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id={`${platform}-upload`}
            />
            <Button variant="outline" className="w-full" asChild>
              <label htmlFor={`${platform}-upload`} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : "Choose File"}
              </label>
            </Button>
          </div>

          {file && (
            <div className="mt-3 flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              <span>File ready to import</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="mb-2">Import Data</h1>
        <p className="text-muted-foreground">
          Upload your social media analytics CSV files to populate the dashboard
        </p>
      </div>

      {/* Instructions */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-2">Import Instructions</h3>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Export your analytics data from LinkedIn and YouTube</li>
          <li>Upload the CSV or Excel files below</li>
          <li>Ensure the column names match the expected format</li>
          <li>Click "Import Data" to process and visualize your metrics</li>
        </ol>
      </Card>

      {/* File Upload Cards */}
      <div className="space-y-6">
        <FileUploadCard
          platform="linkedin"
          file={linkedinFile}
          onFileChange={(e) => handleFileChange(e, "linkedin")}
          expectedColumns={["Date", "Impressions", "Engagements", "Reach", "Followers"]}
        />

        <FileUploadCard
          platform="youtube"
          file={youtubeFile}
          onFileChange={(e) => handleFileChange(e, "youtube")}
          expectedColumns={[
            "Video Title",
            "Video URL",
            "Publish Date",
            "Views",
            "Watch Time (hours)",
            "Impressions",
            "CTR",
          ]}
        />
      </div>

      {/* Import Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleImport}
          disabled={importing || (!linkedinFile && !youtubeFile)}
          className="min-w-[200px]"
        >
          {importing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Import;
