import { Menu, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const handleLogout = () => {
    toast.success("Logged out successfully");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[70px] bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-bold">ASM Control Panel</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
