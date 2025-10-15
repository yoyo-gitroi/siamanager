import { useState } from "react";
import { Video, Upload, Calendar, Users, TrendingUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Agent } from "@/types";
import { cn } from "@/lib/utils";
import AgentModal from "./AgentModal";
import { formatDistanceToNow } from "date-fns";

interface AgentCardProps {
  agent: Agent;
  onRun: (agent: Agent, inputData: Record<string, any>) => void;
}

const iconMap = {
  Video,
  Upload,
  Calendar,
  Users,
  TrendingUp,
  Bot,
};

const AgentCard = ({ agent, onRun }: AgentCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const Icon = iconMap[agent.icon as keyof typeof iconMap] || Bot;

  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    secondary: "bg-secondary/10 text-secondary",
  };

  const statusConfig = {
    idle: { label: "Idle", color: "bg-muted", dot: "bg-muted-foreground" },
    running: { label: "Running", color: "bg-success/10 text-success", dot: "bg-success" },
    failed: { label: "Failed", color: "bg-danger/10 text-danger", dot: "bg-danger" },
  };

  const status = statusConfig[agent.status];

  return (
    <>
      <div className="agent-card group">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "p-4 rounded-2xl transition-transform duration-200 group-hover:scale-110",
              colorClasses[agent.color as keyof typeof colorClasses]
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
          <Badge variant="outline" className={cn("gap-2", status.color)}>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                status.dot,
                agent.status === "running" && "animate-pulse-slow"
              )}
            />
            {status.label}
          </Badge>
        </div>

        <h3 className="text-xl font-semibold mb-2">{agent.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {agent.description}
        </p>

        {agent.lastRun && (
          <p className="text-xs text-muted-foreground mb-4">
            Last run: {formatDistanceToNow(agent.lastRun, { addSuffix: true })}
          </p>
        )}

        <Button
          className="w-full"
          onClick={() => setModalOpen(true)}
          disabled={agent.status === "running"}
        >
          {agent.status === "running" ? "Running..." : "Configure & Run"}
        </Button>
      </div>

      <AgentModal
        agent={agent}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(inputData) => {
          onRun(agent, inputData);
          setModalOpen(false);
        }}
      />
    </>
  );
};

export default AgentCard;
