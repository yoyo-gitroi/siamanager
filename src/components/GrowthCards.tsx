import StatCard from "./StatCard";
import { Users, Clock, TrendingUp, Eye } from "lucide-react";

interface GrowthCardsProps {
  youtubeSubscribers: { current: number; delta7: number; delta30: number };
  youtubeWatchHours: { current: number; delta7: number; delta30: number };
  instagramFollowers: { current: number; delta7: number; delta30: number };
  linkedinFollowers: { current: number; delta7: number; delta30: number };
}

const GrowthCards = ({
  youtubeSubscribers,
  youtubeWatchHours,
  instagramFollowers,
  linkedinFollowers,
}: GrowthCardsProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="YouTube Subscribers"
        value={formatNumber(youtubeSubscribers.current)}
        growth={youtubeSubscribers.delta7}
        icon={Users}
        iconColor="danger"
      />
      <StatCard
        label="YouTube Watch Hours"
        value={formatNumber(youtubeWatchHours.current)}
        growth={youtubeWatchHours.delta7}
        icon={Clock}
        iconColor="primary"
      />
      <StatCard
        label="Instagram Followers"
        value={formatNumber(instagramFollowers.current)}
        growth={instagramFollowers.delta7}
        icon={TrendingUp}
        iconColor="warning"
      />
      <StatCard
        label="LinkedIn Followers"
        value={formatNumber(linkedinFollowers.current)}
        growth={linkedinFollowers.delta7}
        icon={Users}
        iconColor="secondary"
      />
    </div>
  );
};

export default GrowthCards;
