import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

type Org = { id: string; name: string; slug: string; logo: string | null };

const OrgContext = createContext<{
  activeOrg: Org | null;
  setActiveOrg: (orgId: string) => void;
  orgs: Org[];
} | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { data: orgs } = authClient.useListOrganizations();
  const { data: activeOrgData } = authClient.useActiveOrganization();

  const orgList: Org[] = (orgs ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    logo: o.logo,
  }));

  const active = activeOrgData
    ? { id: activeOrgData.id, name: activeOrgData.name, slug: activeOrgData.slug, logo: activeOrgData.logo }
    : orgList[0] ?? null;

  const setActiveOrg = (orgId: string) => {
    authClient.organization.setActive({ organizationId: orgId });
  };

  return (
    <OrgContext.Provider value={{ activeOrg: active, setActiveOrg, orgs: orgList }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
