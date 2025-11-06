import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Database, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableStatus {
  name: string;
  label: string;
  count: number;
  dateRange: { min: string; max: string } | null;
  status: 'populated' | 'empty' | 'error';
}

export function YouTubeDataSummary() {
  const [loading, setLoading] = useState(true);
  const [tableStatuses, setTableStatuses] = useState<DataTableStatus[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const tables = [
    { name: 'yt_channel_daily', label: 'Channel Daily Metrics', dateColumn: 'day' },
    { name: 'yt_video_daily', label: 'Video Daily Metrics', dateColumn: 'day' },
    { name: 'yt_video_metadata', label: 'Video Metadata', dateColumn: 'published_at' },
    { name: 'yt_revenue_daily', label: 'Revenue Data', dateColumn: 'day' },
    { name: 'yt_demographics', label: 'Demographics', dateColumn: 'day' },
    { name: 'yt_geography', label: 'Geography', dateColumn: 'day' },
    { name: 'yt_traffic_sources', label: 'Traffic Sources', dateColumn: 'day' },
    { name: 'yt_device_stats', label: 'Device Stats', dateColumn: 'day' },
    { name: 'yt_audience_retention', label: 'Audience Retention', dateColumn: 'day' },
    { name: 'yt_playlist_analytics', label: 'Playlist Analytics', dateColumn: 'day' },
    { name: 'yt_search_terms', label: 'Search Terms', dateColumn: 'day' },
  ];

  useEffect(() => {
    const fetchDataStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const statuses = await Promise.all(
          tables.map(async (table) => {
            try {
              const { count, error: countError } = await supabase
                .from(table.name as any)
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

              if (countError) throw countError;

              let dateRange = null;
              if (count && count > 0) {
                const { data, error: rangeError } = await supabase
                  .from(table.name as any)
                  .select(table.dateColumn)
                  .eq('user_id', user.id)
                  .order(table.dateColumn, { ascending: true })
                  .limit(1);

                const { data: maxData, error: maxError } = await supabase
                  .from(table.name as any)
                  .select(table.dateColumn)
                  .eq('user_id', user.id)
                  .order(table.dateColumn, { ascending: false })
                  .limit(1);

                if (!rangeError && !maxError && data?.[0] && maxData?.[0]) {
                  dateRange = {
                    min: data[0][table.dateColumn] || '',
                    max: maxData[0][table.dateColumn] || '',
                  };
                }
              }

              return {
                name: table.name,
                label: table.label,
                count: count || 0,
                dateRange,
                status: (count && count > 0 ? 'populated' : 'empty') as 'populated' | 'empty',
              };
            } catch (error) {
              console.error(`Error fetching ${table.name}:`, error);
              return {
                name: table.name,
                label: table.label,
                count: 0,
                dateRange: null,
                status: 'error' as 'error',
              };
            }
          })
        );

        setTableStatuses(statuses);
        setTotalRecords(statuses.reduce((sum, s) => sum + s.count, 0));
      } catch (error) {
        console.error('Error fetching data status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const populatedTables = tableStatuses.filter(t => t.status === 'populated').length;
  const emptyTables = tableStatuses.filter(t => t.status === 'empty').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          YouTube Data Summary
        </CardTitle>
        <CardDescription>
          Overview of your YouTube analytics data across all tables
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">Data Tables</div>
            <div className="text-2xl font-bold">
              {populatedTables} / {tables.length}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="text-2xl font-bold">
              {emptyTables === 0 ? (
                <Badge variant="default" className="text-sm">Complete</Badge>
              ) : (
                <Badge variant="secondary" className="text-sm">{emptyTables} Empty</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Data Table Status</h4>
          {tableStatuses.map((table) => (
            <div
              key={table.name}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {table.status === 'populated' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium text-sm">{table.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {table.count.toLocaleString()} records
                  </div>
                </div>
              </div>
              {table.dateRange && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(table.dateRange.min).toLocaleDateString()} -{' '}
                    {new Date(table.dateRange.max).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}