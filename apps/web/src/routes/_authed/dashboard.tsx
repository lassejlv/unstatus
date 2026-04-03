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
  Settings,
} from "lucide-react";
import { Canvas } from "@/components/canvas";

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
  { label: "Settings", to: "/dashboard/settings", search: {}, icon: Settings },
] as const;

function DashboardLayout() {
  const { data: session } = authClient.useSession();
  const matchRoute = useMatchRoute();

  const currentPage = navItems.find((item) =>
    !!matchRoute({ to: item.to, fuzzy: true })
  );

  return (
    <OrgProvider>
      <SidebarProvider>
        <Sidebar>
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
                          isActive={!!matchRoute({ to: item.to, fuzzy: true })}
                        >
                          <Link to={item.to} search={item.search}>
                            <Icon className="size-4" />
                            {item.label}
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
          </header>
          <Canvas>
            <Outlet />
          </Canvas>
        </SidebarInset>
      </SidebarProvider>
    </OrgProvider>
  );
}
