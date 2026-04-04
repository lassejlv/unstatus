import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/-public-nav";
import Markdown from "react-markdown";
import { ArrowLeft } from "lucide-react";
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
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back
          </Link>

          <article className="mt-8 prose prose-zinc dark:prose-invert max-w-none">
            <Markdown 
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-medium tracking-tight mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-medium mt-8 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium mt-6 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-sm leading-relaxed text-muted-foreground mb-4">{children}</p>,
                li: ({ children }) => <li className="text-sm text-muted-foreground mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
                a: ({ href, children }) => <a href={href} className="text-foreground underline underline-offset-2 hover:no-underline">{children}</a>,
                table: ({ children }) => <table className="w-full text-sm my-4 border-collapse">{children}</table>,
                th: ({ children }) => <th className="text-left text-foreground font-medium py-2 border-b">{children}</th>,
                td: ({ children }) => <td className="py-2 text-muted-foreground border-b">{children}</td>,
              }}
            >
              {privacyContent}
            </Markdown>
          </article>
        </div>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} unstatus</span>
          <Link to="/legal" className="text-xs text-muted-foreground hover:text-foreground">Legal</Link>
        </div>
      </footer>
    </div>
  );
}
