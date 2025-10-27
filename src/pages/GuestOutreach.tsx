import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GuestOutreach = () => {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [minFollowers, setMinFollowers] = useState("10000");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!topic || !user) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      // In production, this would call an API to search for candidates
      toast.info("Guest search feature coming soon. Upload CSV for now.");
    } catch (error) {
      toast.error("Failed to search for guests");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("guest_candidates")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setCandidates(
        candidates.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "contacted":
        return "secondary";
      case "declined":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Guest Outreach</h1>
        <p className="text-muted-foreground">
          Find and manage guest collaboration opportunities based on audience overlap
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4">Find Guests</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic/Niche</Label>
            <Input
              id="topic"
              placeholder="e.g., AI, Marketing, Fitness"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followers">Min Followers</Label>
            <Input
              id="followers"
              type="number"
              value={minFollowers}
              onChange={(e) => setMinFollowers(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={loading} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/5 rounded-lg">
          <h3 className="text-sm font-medium mb-2">💡 How It Works</h3>
          <p className="text-sm text-muted-foreground">
            Our algorithm analyzes audience demographics and engagement patterns to suggest
            guests whose followers align with your audience, maximizing collaboration impact.
          </p>
        </div>
      </Card>

      {candidates.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4">Guest Candidates</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Audience Overlap</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell className="font-medium">{candidate.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{candidate.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    {candidate.followers.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {candidate.audience_overlap_estimate
                      ? `${(candidate.audience_overlap_estimate * 100).toFixed(1)}%`
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={candidate.status}
                      onValueChange={(value) =>
                        handleStatusChange(candidate.id, value)
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
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

export default GuestOutreach;
