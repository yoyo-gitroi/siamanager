import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Globe, Clock, Heart } from "lucide-react";

interface AudienceDNAPanelProps {
  data: {
    demographics: {
      topAgeGroup: string;
      genderSplit: {
        male: number;
        female: number;
      };
      topCountries: string[];
    };
    psychographics: string[];
    peakHours: string[];
    contentPreferences: string[];
  };
}

export const AudienceDNAPanel = ({ data }: AudienceDNAPanelProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-none shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            🧠 Audience DNA (14-Day Deep Dive)
          </h3>
          <p className="text-sm text-muted-foreground">
            Who's actually watching you
          </p>
        </div>
        <Users className="h-8 w-8 text-primary" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Demographics */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-foreground">Demographics</h4>
          </div>

          <div className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Gender Split</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-blue-500/20 rounded p-2 text-center border border-blue-500/30">
                  <p className="text-sm font-bold text-foreground">{data.demographics.genderSplit.male}%</p>
                  <p className="text-xs text-muted-foreground">Male</p>
                </div>
                <div className="flex-1 bg-pink-500/20 rounded p-2 text-center border border-pink-500/30">
                  <p className="text-sm font-bold text-foreground">{data.demographics.genderSplit.female}%</p>
                  <p className="text-xs text-muted-foreground">Female</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Top Age Group</p>
              <Badge variant="secondary" className="font-semibold">
                {data.demographics.topAgeGroup}
              </Badge>
            </div>

            {data.demographics.topCountries && data.demographics.topCountries.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Top Countries</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.demographics.topCountries.map((country, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Psychographics & Preferences */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-foreground">Interests & Preferences</h4>
          </div>

          {data.psychographics && data.psychographics.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Primary Interests</p>
              <div className="space-y-1">
                {data.psychographics.map((interest, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">├─</span>
                    <p className="text-sm text-foreground">{interest}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.contentPreferences && data.contentPreferences.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Content Style</p>
              <div className="flex flex-wrap gap-2">
                {data.contentPreferences.map((pref, idx) => (
                  <Badge key={idx} variant="secondary">
                    {pref}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {data.peakHours && data.peakHours.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Peak Hours (IST)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.peakHours.map((hour, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono">
                    {hour}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
