import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CorrelationMatrixProps {
  correlations: any[];
  selectedMetric: string;
}

const CorrelationMatrix = ({ correlations, selectedMetric }: CorrelationMatrixProps) => {
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const platforms = ["YouTube", "LinkedIn", "Instagram"];

  const getCorrelation = (platformA: string, platformB: string) => {
    if (platformA === platformB) return null;
    
    const corr = correlations.find(
      (c) =>
        ((c.platform_a.toLowerCase() === platformA.toLowerCase() &&
          c.platform_b.toLowerCase() === platformB.toLowerCase()) ||
        (c.platform_a.toLowerCase() === platformB.toLowerCase() &&
          c.platform_b.toLowerCase() === platformA.toLowerCase())) &&
        c.metric_a === selectedMetric &&
        c.metric_b === selectedMetric
    );

    return corr?.correlation_coeff || 0;
  };

  const getColorClass = (value: number) => {
    const abs = Math.abs(value);
    if (abs > 0.7) return "bg-success/20 text-success";
    if (abs > 0.4) return "bg-warning/20 text-warning";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        <div className="p-4" />
        {platforms.map((platform) => (
          <div key={platform} className="p-4 text-center font-medium">
            {platform}
          </div>
        ))}

        {platforms.map((rowPlatform) => (
          <>
            <div key={`label-${rowPlatform}`} className="p-4 font-medium flex items-center">
              {rowPlatform}
            </div>
            {platforms.map((colPlatform) => {
              const coeff = getCorrelation(rowPlatform, colPlatform);
              
              if (coeff === null) {
                return (
                  <div key={`${rowPlatform}-${colPlatform}`} className="p-4 bg-muted/30" />
                );
              }

              return (
                <Card
                  key={`${rowPlatform}-${colPlatform}`}
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${getColorClass(coeff)}`}
                  onClick={() => setSelectedCell({ rowPlatform, colPlatform, coeff })}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold">{coeff.toFixed(2)}</div>
                    <div className="text-xs mt-1 flex items-center justify-center gap-1">
                      {coeff > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(coeff) > 0.5 ? "Strong" : "Moderate"}
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        ))}
      </div>

      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Correlation: {selectedCell?.rowPlatform} ↔ {selectedCell?.colPlatform}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant={selectedCell?.coeff > 0 ? "default" : "secondary"}>
                Coefficient: {selectedCell?.coeff?.toFixed(3)}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {Math.abs(selectedCell?.coeff) > 0.7
                  ? "Strong correlation - content performs similarly"
                  : Math.abs(selectedCell?.coeff) > 0.4
                  ? "Moderate correlation - some overlap"
                  : "Weak correlation - independent performance"}
              </p>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg">
              <h4 className="font-medium mb-2">💡 Redistribution Suggestion</h4>
              <p className="text-sm">
                {selectedCell?.coeff > 0.5
                  ? `High-performing content on ${selectedCell?.rowPlatform} is likely to perform well on ${selectedCell?.colPlatform}. Consider cross-posting your top content.`
                  : `Content performs differently across these platforms. Tailor your strategy for each audience.`}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CorrelationMatrix;
