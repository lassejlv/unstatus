import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function UserDropdown({
  user,
}: {
  user: { name: string; email: string; image?: string | null };
}) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar size="sm">
                {user.image && <AvatarImage src={user.image} />}
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium">
                  {user.name}
                </span>
                <span className="truncate text-[0.625rem] text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                strokeWidth={2}
                className="ml-auto size-3.5"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Theme</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4 mr-2" />
              Light
              {theme === "light" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4 mr-2" />
              Dark
              {theme === "dark" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("auto")}>
              <Monitor className="size-4 mr-2" />
              System
              {theme === "auto" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut();
                navigate({ to: "/login" });
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
