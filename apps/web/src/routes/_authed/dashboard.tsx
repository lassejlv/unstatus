import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
import { UserDropdown } from "@/components/user-dropdown";
import { OrgProvider } from "@/components/org-context";
import { authClient } from "@/lib/auth-client";
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Globe,
  Mail,
  Bell,
  CreditCard,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { Canvas } from "@/components/canvas";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardLayout,
});

const navItems = [
  { label: "Overview", to: "/dashboard", search: { tab: "overview" }, icon: LayoutDashboard },
  { label: "Monitors", to: "/dashboard/monitors", search: {}, icon: Activity },
  { label: "Incidents", to: "/dashboard/incidents", search: {}, icon: AlertTriangle },
  { label: "Status Pages", to: "/dashboard/status-pages", search: {}, icon: Globe },
  { label: "Subscribers", to: "/dashboard/subscribers", search: {}, icon: Mail },
  { label: "Notifications", to: "/dashboard/notifications", search: {}, icon: Bell },
  { label: "Billing", to: "/dashboard/billing", search: {}, icon: CreditCard },
  { label: "Settings", to: "/dashboard/settings", search: {}, icon: Settings },
] as const;

function DashboardLayout() {
  const { data: session } = authClient.useSession();
  const matchRoute = useMatchRoute();
  const { theme, setTheme } = useTheme();

  const currentPage = navItems.find((item) =>
    !!matchRoute({ to: item.to, fuzzy: item.to !== "/dashboard" })
  );

  return (
    <OrgProvider>
      <SidebarProvider>
        <Sidebar variant="inset">
          <SidebarHeader>
            <OrgSwitcher />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={!!matchRoute({ to: item.to, fuzzy: item.to !== "/dashboard" })}
                        >
                          <Link to={item.to} search={item.search} className="group/nav">
                            <Icon className="size-4 transition-transform duration-200 ease-out group-hover/nav:translate-x-0.5" />
                            <span className="transition-transform duration-200 ease-out group-hover/nav:translate-x-0.5">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            {session?.user && <UserDropdown user={session.user} />}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-10 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            {currentPage && (
              <>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm font-medium">{currentPage.label}</span>
              </>
            )}
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </button>
            </div>
          </header>
          <Canvas>
            <Outlet />
          </Canvas>
        </SidebarInset>
      </SidebarProvider>
    </OrgProvider>
  );
}
