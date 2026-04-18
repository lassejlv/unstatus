import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
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
import { UserDropdown } from "@/components/user-dropdown";
import { authClient } from "@/lib/auth-client";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Activity,
  BookOpen,
  ArrowLeft,
  Sun,
  Moon,
  Heart,
} from "lucide-react";
import { Canvas } from "@/components/canvas";
import { useTheme } from "@/hooks/use-theme";
import { useEffect } from "react";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminLayout,
});

const navItems = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Organizations", to: "/admin/organizations", icon: Building2 },
  { label: "Monitors", to: "/admin/monitors", icon: Activity },
  { label: "Registry", to: "/admin/registry", icon: BookOpen },
  { label: "OSS", to: "/admin/oss-applications", icon: Heart },
] as const;

function AdminLayout() {
  const { data: session } = authClient.useSession();
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const user = session?.user as { isAdmin?: boolean } | undefined;
    if (session && !user?.isAdmin) {
      navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!session || !user?.isAdmin) return null;

  const currentPage = navItems.find((item) =>
    !!matchRoute({ to: item.to, fuzzy: item.to !== "/admin" }),
  );

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-sm font-semibold">Admin</span>
          </div>
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
                        isActive={!!matchRoute({ to: item.to, fuzzy: item.to !== "/admin" })}
                      >
                        <Link to={item.to}>
                          <motion.div
                            whileHover={{ scale: 1.15, rotate: [0, -10, 10, -5, 5, 0] }}
                            transition={{ scale: { duration: 0.2 }, rotate: { duration: 0.4, ease: "easeInOut" } }}
                            className="flex items-center justify-center"
                          >
                            <Icon className="size-4" />
                          </motion.div>
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/dashboard">
                      <ArrowLeft className="size-4" />
                      <span>Back to Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
  );
}
