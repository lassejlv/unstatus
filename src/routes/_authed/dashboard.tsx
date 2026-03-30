import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

export const Route = createFileRoute("/_authed/dashboard")({
  component: DashboardLayout,
});

const navItems = [
  { label: "Overview", to: "/dashboard", search: { tab: "overview" } },
  { label: "Monitors", to: "/dashboard/monitors", search: {} },
  { label: "Incidents", to: "/dashboard/incidents", search: {} },
  { label: "Status Pages", to: "/dashboard/status-pages", search: {} },
  { label: "Settings", to: "/dashboard/settings", search: {} },
] as const;

function DashboardLayout() {
  const { data: session } = authClient.useSession();
  const matchRoute = useMatchRoute();

  return (
    <OrgProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <OrgSwitcher />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={!!matchRoute({ to: item.to, fuzzy: true })}
                      >
                        <Link to={item.to} search={item.search}>
                          {item.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
          </header>
          <div className="flex-1 p-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </OrgProvider>
  );
}
