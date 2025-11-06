import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Demographics, Geography, TrafficSource, DeviceStats } from "@/hooks/useYouTubeData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AudienceInsightsPanelProps {
  demographics: Demographics[];
  geography: Geography[];
  trafficSources: TrafficSource[];
  deviceStats: DeviceStats[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--secondary))",
  "hsl(var(--danger))",
];

const AudienceInsightsPanel = ({
  demographics,
  geography,
  trafficSources,
  deviceStats,
}: AudienceInsightsPanelProps) => {
  // Get the most recent data date for display
  const mostRecentDate = demographics.length > 0 
    ? new Date(demographics[0].day).toLocaleDateString() 
    : "N/A";
  // Aggregate demographics
  const demoData = demographics.reduce((acc, demo) => {
    const key = `${demo.age_group}-${demo.gender}`;
    const existing = acc.find((d) => d.key === key);
    if (existing) {
      existing.percentage += demo.viewer_percentage || 0;
    } else {
      acc.push({
        key,
        name: `${demo.age_group} ${demo.gender}`,
        percentage: demo.viewer_percentage || 0,
      });
    }
    return acc;
  }, [] as Array<{ key: string; name: string; percentage: number }>);

  // Top countries
  const topCountries = geography
    .reduce((acc, geo) => {
      const existing = acc.find((c) => c.country === geo.country);
      if (existing) {
        existing.views += geo.views;
      } else {
        acc.push({ country: geo.country, views: geo.views });
      }
      return acc;
    }, [] as Array<{ country: string; views: number }>)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Traffic sources aggregated
  const trafficData = trafficSources
    .reduce((acc, source) => {
      const existing = acc.find((s) => s.type === source.source_type);
      if (existing) {
        existing.views += source.views;
      } else {
        acc.push({ type: source.source_type, views: source.views });
      }
      return acc;
    }, [] as Array<{ type: string; views: number }>)
    .sort((a, b) => b.views - a.views);

  // Device breakdown
  const deviceData = deviceStats
    .reduce((acc, device) => {
      const existing = acc.find((d) => d.type === device.device_type);
      if (existing) {
        existing.views += device.views;
      } else {
        acc.push({ type: device.device_type, views: device.views });
      }
      return acc;
    }, [] as Array<{ type: string; views: number }>)
    .sort((a, b) => b.views - a.views);

  return (
    <div className="space-y-4">
      {/* Data Freshness Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Quarterly Data
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Audience insights are updated quarterly by YouTube Analytics API. Showing most recent data from <strong>{mostRecentDate}</strong>.
              This data is independent of the date range filter above.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="demographics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

      <TabsContent value="demographics" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h3 className="mb-4">Age & Gender Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={demoData.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) =>
                    `${name}: ${percentage.toFixed(1)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="percentage"
                >
                  {demoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-card">
            <h3 className="mb-4">Demographic Breakdown</h3>
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age Group</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demographics.slice(0, 15).map((demo, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{demo.age_group}</TableCell>
                      <TableCell>{demo.gender}</TableCell>
                      <TableCell className="text-right">
                        {demo.viewer_percentage?.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="geography" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h3 className="mb-4">Top Countries by Views</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCountries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="country" type="category" className="text-xs" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-card">
            <h3 className="mb-4">Geographic Distribution</h3>
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Watch Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCountries.map((geo, idx) => {
                    const geoData = geography.find((g) => g.country === geo.country);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{geo.country}</TableCell>
                        <TableCell className="text-right">
                          {geo.views.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {geoData
                            ? ((geoData.watch_time_seconds || 0) / 3600).toFixed(1)
                            : "0"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="traffic" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h3 className="mb-4">Traffic Source Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={trafficData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, views }) =>
                    `${type}: ${views.toLocaleString()}`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="views"
                >
                  {trafficData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-card">
            <h3 className="mb-4">Traffic Sources Detail</h3>
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Type</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trafficData.map((source, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{source.type}</TableCell>
                      <TableCell className="text-right">
                        {source.views.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="devices" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h3 className="mb-4">Device Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, views }) =>
                    `${type}: ${views.toLocaleString()}`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="views"
                >
                  {deviceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-card">
            <h3 className="mb-4">Device Breakdown</h3>
            <div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device Type</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Watch Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceStats.slice(0, 15).map((device, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{device.device_type}</TableCell>
                      <TableCell className="text-right">
                        {device.views.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {((device.watch_time_seconds || 0) / 3600).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TabsContent>
      </Tabs>
    </div>
  );
};

export default AudienceInsightsPanel;
