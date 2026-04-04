import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import "./global.css";

export const metadata = {
  title: {
    template: "%s | Unstatus API Docs",
    default: "Unstatus API Docs",
  },
  description: "API documentation for the Unstatus REST API.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
