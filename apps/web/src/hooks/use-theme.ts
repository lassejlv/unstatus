import { useSyncExternalStore, useCallback } from "react";

type Theme = "light" | "dark" | "auto";

function getSnapshot(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return "auto";
}

function getServerSnapshot(): Theme {
  return "auto";
}

function subscribe(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === "theme") callback();
  };
  window.addEventListener("storage", handler);
  // Also listen for our custom event for same-tab updates
  window.addEventListener("theme-change", callback);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("theme-change", callback);
  };
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "auto" ? (prefersDark ? "dark" : "light") : theme;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  if (theme === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  root.style.colorScheme = resolved;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  return { theme, setTheme } as const;
}
