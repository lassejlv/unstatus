import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

type Org = { id: string; name: string; slug: string; logo: string | null };

const OrgContext = createContext<{
  activeOrg: Org | null;
  setActiveOrg: (org: Org) => void;
  orgs: Org[];
} | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { data: orgs } = useQuery(orpc.orgs.list.queryOptions());
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const resolved = activeOrg ?? orgs?.[0] ?? null;

  return (
    <OrgContext.Provider value={{ activeOrg: resolved, setActiveOrg, orgs: orgs ?? [] }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
