import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Activity, Globe, Bell, GitBranch, Code, Workflow } from "lucide-react";
import { type ReactNode } from "react";

export function Features() {
  return (
    <section className="py-16 md:py-32">
      <div className="@container mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            Everything you need to stay online
          </h2>
          <p className="mt-4 text-muted-foreground">
            Monitor, communicate, and resolve — before your users even notice.
          </p>
        </div>
        <div className="@min-4xl:max-w-full @min-4xl:grid-cols-3 mx-auto mt-8 grid max-w-sm gap-6 *:text-center md:mt-16">
          <Card className="group border-0 bg-muted shadow-none">
            <CardHeader className="items-center pb-3">
              <CardDecorator>
                <Activity className="size-6" aria-hidden />
              </CardDecorator>
              <h3 className="mt-6 font-medium">Uptime monitoring</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                HTTP, TCP, and ping checks from multiple regions with
                configurable intervals down to 1 minute.
              </p>
            </CardContent>
          </Card>

          <Card className="group border-0 bg-muted shadow-none">
            <CardHeader className="items-center pb-3">
              <CardDecorator>
                <Globe className="size-6" aria-hidden />
              </CardDecorator>
              <h3 className="mt-6 font-medium">Status pages</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Public status pages on your own domain with custom branding,
                CSS, and automatic incident timelines.
              </p>
            </CardContent>
          </Card>

          <Card className="group border-0 bg-muted shadow-none">
            <CardHeader className="items-center pb-3">
              <CardDecorator>
                <Bell className="size-6" aria-hidden />
              </CardDecorator>
              <h3 className="mt-6 font-medium">Alerts</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Get notified instantly via email, Discord, or webhooks when
                something goes down — and when it recovers.
              </p>
            </CardContent>
          </Card>

          <Card className="group border-0 bg-muted shadow-none">
            <CardHeader className="items-center pb-3">
              <CardDecorator>
                <Workflow className="size-6" aria-hidden />
              </CardDecorator>
              <h3 className="mt-6 font-medium">Incident management</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Auto-create incidents when monitors fail. Post updates and
                track resolution with a full timeline.
              </p>
            </CardContent>
          </Card>

          <Card className="group border-0 bg-muted shadow-none">
            <CardHeader className="items-center pb-3">
              <CardDecorator>
                <GitBranch className="size-6" aria-hidden />
              </CardDecorator>
              <h3 className="mt-6 font-medium">Dependencies</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Track third-party services your app relies on. Know immediately
                when an upstream provider has issues.
              </p>
            </CardContent>
          </Card>

          <Card className="group border-0 bg-muted shadow-none">
            <CardHeader className="items-center pb-3">
              <CardDecorator>
                <Code className="size-6" aria-hidden />
              </CardDecorator>
              <h3 className="mt-6 font-medium">API access</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Full REST API for automation. Create monitors, update incidents,
                and query uptime data programmatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div
    aria-hidden
    className="relative mx-auto size-36 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"
  >
    <div className="absolute inset-0 [--border:black] dark:[--border:white] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />
    <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-t border-l">
      {children}
    </div>
  </div>
);
