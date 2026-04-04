import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/-public-nav";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/legal")({
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-2xl font-medium tracking-tight">Legal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Legal documents and policies for unstatus.
          </p>

          <div className="mt-8 space-y-4">
            <Link
              to="/terms"
              className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div>
                <p className="font-medium">Terms of Service</p>
                <p className="text-sm text-muted-foreground">The rules for using unstatus</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/privacy"
              className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div>
                <p className="font-medium">Privacy Policy</p>
                <p className="text-sm text-muted-foreground">How we handle your data</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
        </div>
      </footer>
    </div>
  );
}
