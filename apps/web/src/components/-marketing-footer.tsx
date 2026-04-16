import { Link } from "@tanstack/react-router";

const footerLinks = [
  { label: "Docs", href: "/docs", external: true },
  { label: "Registry", to: "/registry" },
  { label: "Pricing", to: "/pricing" },
  { label: "Legal", to: "/legal" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 sm:py-6">
        <span className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} unstatus
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {footerLinks.map((link) =>
            "external" in link ? (
              <a
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </footer>
  );
}
