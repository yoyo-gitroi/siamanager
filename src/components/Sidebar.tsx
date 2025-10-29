import { NavLink } from "react-router-dom";
import { Home, BarChart3, FileText, Calendar, MessageSquare, Settings, X, TrendingUp, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: Home, label: "Overview", path: "/" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: TrendingUp, label: "Growth Insights", path: "/growth" },
  { icon: FileText, label: "Content", path: "/content" },
  { icon: Calendar, label: "Publishing", path: "/publishing" },
  { icon: MessageSquare, label: "Engagement", path: "/engagement" },
  { icon: Youtube, label: "YouTube Setup", path: "/youtube-setup" },
  { icon: Youtube, label: "YouTube Data", path: "/youtube-data" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-[70px] bottom-0 w-[250px] bg-sidebar border-r border-sidebar-border z-40 transition-transform duration-200",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 lg:hidden"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => onClose()}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent text-sidebar-foreground",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
