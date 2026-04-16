import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Activity, Globe, Bell, GitBranch, Code, Workflow } from "lucide-react";
import { type ReactNode } from "react";

export function Features() {
  return (
    <section className="border-t py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-semibold lg:text-4xl">
            Features
          </h2>
        </div>
        <div className="mx-auto mt-8 grid gap-4 *:text-center sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
          <Card className="group shadow-none">
            <CardHeader className="items-center pb-2">
              <CardDecorator>
                <Activity className="size-5" aria-hidden />
              </CardDecorator>
              <h3 className="mt-4 font-medium">Uptime monitoring</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                HTTP, TCP, and ping checks from multiple regions. Catch outages
                before your users do with intervals as low as 10 seconds.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-none">
            <CardHeader className="items-center pb-2">
              <CardDecorator>
                <Globe className="size-5" aria-hidden />
              </CardDecorator>
              <h3 className="mt-4 font-medium">Status pages</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Beautiful public status pages on your own domain. Custom branding,
                CSS, and automatic incident timelines keep users informed.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-none">
            <CardHeader className="items-center pb-2">
              <CardDecorator>
                <Bell className="size-5" aria-hidden />
              </CardDecorator>
              <h3 className="mt-4 font-medium">Instant alerts</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Get notified via email, Discord, or webhooks the moment something
                breaks. Recovery alerts too, so you know when you are back online.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-none">
            <CardHeader className="items-center pb-2">
              <CardDecorator>
                <Workflow className="size-5" aria-hidden />
              </CardDecorator>
              <h3 className="mt-4 font-medium">Incident management</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Auto-create incidents when monitors fail. Post updates, track
                resolution, and maintain a complete timeline for post-mortems.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-none">
            <CardHeader className="items-center pb-2">
              <CardDecorator>
                <GitBranch className="size-5" aria-hidden />
              </CardDecorator>
              <h3 className="mt-4 font-medium">Dependency tracking</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Monitor third-party services your app relies on. Know instantly
                when Stripe, AWS, or any upstream provider has issues.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-none">
            <CardHeader className="items-center pb-2">
              <CardDecorator>
                <Code className="size-5" aria-hidden />
              </CardDecorator>
              <h3 className="mt-4 font-medium">API access</h3>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Full REST API for automation. Create monitors, update incidents,
                and integrate uptime data into your existing workflows.
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
    className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"
  >
    {children}
  </div>
);
