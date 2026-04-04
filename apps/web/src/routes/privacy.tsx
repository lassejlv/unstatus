import { createFileRoute } from "@tanstack/react-router";
import { PublicNav } from "@/components/-public-nav";
import Markdown from "react-markdown";
// @ts-ignore - Import markdown from repo root
import privacyContent from "../../../../PRIVACY.md?raw";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />

      <main className="flex-1">
        <article className="prose prose-sm mx-auto max-w-3xl px-6 py-12 dark:prose-invert">
          <Markdown>{privacyContent}</Markdown>
        </article>
      </main>

      <footer className="mt-auto">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
        </div>
      </footer>
    </div>
  );
}
