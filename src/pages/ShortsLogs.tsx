import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, ExternalLink } from "lucide-react";

interface ShortsLog {
  id: string;
  user_email: string;
  video_url: string;
  number_of_shorts: number;
  avg_video_time: number;
  created_at: string;
}

const ShortsLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ShortsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.email === "yash.vats@agentic.it") {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("shorts_generation_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLogs(data || []);

      // Calculate stats per user
      const userStats: Record<string, number> = {};
      data?.forEach((log) => {
        userStats[log.user_email] = (userStats[log.user_email] || 0) + log.number_of_shorts;
      });
      setStats(userStats);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.email !== "yash.vats@agentic.it") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <p className="text-muted-foreground">Access denied. This page is only accessible to administrators.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="mb-3">Shorts Generation Logs</h1>
        <p className="text-muted-foreground text-lg">
          Track all shorts generation activity across users
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Generations</p>
          <p className="text-3xl font-bold">{logs.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Shorts Created</p>
          <p className="text-3xl font-bold">
            {logs.reduce((sum, log) => sum + log.number_of_shorts, 0)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Active Users</p>
          <p className="text-3xl font-bold">{Object.keys(stats).length}</p>
        </Card>
      </div>

      {/* User Stats */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Shorts per User</h2>
        <div className="space-y-3">
          {Object.entries(stats).map(([email, count]) => (
            <div key={email} className="flex items-center justify-between">
              <span className="text-sm">{email}</span>
              <span className="font-semibold">{count} shorts</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Video URL</TableHead>
                <TableHead>Shorts</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.user_email}</TableCell>
                  <TableCell>
                    <a
                      href={log.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      View Video
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>{log.number_of_shorts}</TableCell>
                  <TableCell>{log.avg_video_time}s</TableCell>
                  <TableCell>{format(new Date(log.created_at), "PPp")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ShortsLogs;
