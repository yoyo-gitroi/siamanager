import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, FolderOpen, Tag, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoDetailsModalProps {
  video: {
    video_id: string;
    title: string | null;
    description: string | null;
    published_at: string | null;
    duration_seconds: number | null;
    thumbnail_url: string | null;
    tags: string[] | null;
    category_id?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_MAP: Record<string, string> = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "19": "Travel & Events",
  "20": "Gaming",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "Howto & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits & Activism",
};

export function VideoDetailsModal({ video, open, onOpenChange }: VideoDetailsModalProps) {
  if (!video) return null;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const categoryName = video.category_id ? CATEGORY_MAP[video.category_id] || `Category ${video.category_id}` : "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">Video Details</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6">
            {/* Thumbnail */}
            {video.thumbnail_url && (
              <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                <img 
                  src={video.thumbnail_url} 
                  alt={video.title || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <h3 className="text-2xl font-bold mb-2">{video.title || 'Untitled Video'}</h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`https://youtube.com/watch?v=${video.video_id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Watch on YouTube
              </Button>
            </div>

            <Separator />

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Published</p>
                  <p className="font-medium">
                    {video.published_at 
                      ? new Date(video.published_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {video.duration_seconds ? formatDuration(video.duration_seconds) : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{categoryName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Video ID</p>
                  <p className="font-mono text-xs">{video.video_id}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            {video.description && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  Description
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {video.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {video.tags && video.tags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags ({video.tags.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
