import { NavLink } from "react-router-dom";
import { Home, BarChart3, PenTool, Send, MessageSquare, Settings, X, FileText, Database, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: Home, label: "Overview", path: "/" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Youtube, label: "YouTube Analytics", path: "/youtube-analytics" },
  { icon: Instagram, label: "Instagram Setup", path: "/instagram-setup" },
  { icon: Instagram, label: "Instagram Analytics", path: "/instagram-analytics" },
  { icon: Database, label: "YouTube Data", path: "/youtube-data" },
  { icon: PenTool, label: "Create", path: "/create" },
  { icon: Send, label: "Post", path: "/post" },
  { icon: MessageSquare, label: "Engage", path: "/engage" },
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
          
          {/* Logs - Access controlled by RLS policies */}
          <NavLink
            to="/shorts-logs"
            onClick={() => onClose()}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent text-sidebar-foreground",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
              )
            }
          >
            <FileText className="h-5 w-5" />
            <span>Logs</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
