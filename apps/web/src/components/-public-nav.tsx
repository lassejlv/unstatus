import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const navLinks = [
  { label: "Registry", to: "/registry" },
  { label: "Pricing", to: "/pricing" },
] as const;

export function PublicNav({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/Logo.png" alt="unstatus" className="size-7" />
          <span className="text-sm font-semibold tracking-tight">unstatus</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors hover:text-foreground ${
                active === link.to ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/login">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle>
                <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                  <img src="/Logo.png" alt="unstatus" className="size-6" />
                  <span className="text-sm font-semibold">unstatus</span>
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                    active === link.to ? "font-medium bg-accent" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t" />
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Sign in</Button>
              </Link>
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button className="w-full">Get started</Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
