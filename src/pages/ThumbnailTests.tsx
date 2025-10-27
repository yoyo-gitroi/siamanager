import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ThumbnailTests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [videoId, setVideoId] = useState("");

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user]);

  const fetchTests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("yt_thumbnail_tests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error("Error fetching tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!videoId || !user) {
      toast.error("Please enter a video ID");
      return;
    }

    try {
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

      const variants = ["A", "B", "C"];
      const records = variants.map((variant) => ({
        user_id: user.id,
        video_id: videoId,
        variant_label: variant,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
      }));

      const { error } = await supabase.from("yt_thumbnail_tests").insert(records);

      if (error) throw error;

      toast.success("A/B test created successfully");
      setIsOpen(false);
      setVideoId("");
      fetchTests();
    } catch (error) {
      toast.error("Failed to create test");
    }
  };

  const markWinner = async (testId: string) => {
    try {
      const { error } = await supabase
        .from("yt_thumbnail_tests")
        .update({ winner: true })
        .eq("id", testId);

      if (error) throw error;

      toast.success("Winner marked!");
      fetchTests();
    } catch (error) {
      toast.error("Failed to mark winner");
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading tests...</div>;
  }

  const groupedTests = tests.reduce((acc, test) => {
    if (!acc[test.video_id]) {
      acc[test.video_id] = [];
    }
    acc[test.video_id].push(test);
    return {};
  }, {});

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">YouTube Thumbnail A/B Tests</h1>
          <p className="text-muted-foreground">
            Test different thumbnails and track performance
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Thumbnail Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-id">Video ID</Label>
                <Input
                  id="video-id"
                  placeholder="dQw4w9WgXcQ"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                This will create 3 variants (A, B, C) with a 24-hour test window.
              </p>

              <Button onClick={handleCreateTest} className="w-full">
                Create Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tests.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No tests yet. Create your first A/B test to compare thumbnail performance.
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Video ID</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-mono text-sm">
                    {test.video_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{test.variant_label}</Badge>
                  </TableCell>
                  <TableCell>{(test.ctr * 100).toFixed(2)}%</TableCell>
                  <TableCell>{test.impressions.toLocaleString()}</TableCell>
                  <TableCell>
                    {test.winner ? (
                      <Badge>
                        <Trophy className="h-3 w-3 mr-1" />
                        Winner
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Testing</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!test.winner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markWinner(test.id)}
                      >
                        Mark Winner
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default ThumbnailTests;
