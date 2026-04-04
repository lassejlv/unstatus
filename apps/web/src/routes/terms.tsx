import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/-public-nav";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft } from "lucide-react";
// @ts-ignore - Import markdown from repo root
import termsContent from "../../../../TERMS.md?raw";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNav />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back
          </Link>

          <article className="mt-8 max-w-none">
            <Markdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-medium tracking-tight mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-medium mt-8 mb-3">{children}</h2>,
                p: ({ children }) => <p className="text-sm leading-relaxed text-muted-foreground mb-4">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 space-y-1">{children}</ul>,
                li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
                strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
                a: ({ href, children }) => <a href={href} className="text-foreground underline underline-offset-2 hover:no-underline">{children}</a>,
                table: ({ children }) => (
                  <div className="my-6 overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                th: ({ children }) => <th className="px-4 py-2 text-left text-xs font-medium text-foreground">{children}</th>,
                td: ({ children }) => <td className="px-4 py-2 border-t text-muted-foreground">{children}</td>,
                tr: ({ children }) => <tr>{children}</tr>,
              }}
            >
              {termsContent}
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
