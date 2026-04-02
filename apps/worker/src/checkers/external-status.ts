export type ExternalStatusResult = {
  overallStatus: string;
  description: string;
  components: {
    externalId: string;
    name: string;
    status: string;
    description: string | null;
    groupName: string | null;
  }[];
  activeIncidentName: string | null;
};

type AtlassianSummary = {
  page: { id: string; name: string; url: string };
  status: { indicator: string; description: string };
  components: {
    id: string;
    name: string;
    status: string;
    description: string | null;
    group_id: string | null;
    group: boolean;
  }[];
  incidents: {
    id: string;
    name: string;
    status: string;
    impact: string;
  }[];
};

const ATLASSIAN_STATUS_MAP: Record<string, string> = {
  none: "operational",
  minor: "degraded_performance",
  major: "partial_outage",
  critical: "major_outage",
  maintenance: "maintenance",
};

const ATLASSIAN_COMPONENT_STATUS_MAP: Record<string, string> = {
  operational: "operational",
  degraded_performance: "degraded_performance",
  partial_outage: "partial_outage",
  major_outage: "major_outage",
  under_maintenance: "maintenance",
};

async function parseAtlassianStatuspage(url: string): Promise<ExternalStatusResult> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }

  const data = (await res.json()) as AtlassianSummary;

  const overallStatus = ATLASSIAN_STATUS_MAP[data.status?.indicator] ?? "unknown";

  const components = (data.components ?? [])
    .filter((c) => !c.group)
    .map((c) => ({
      externalId: c.id,
      name: c.name,
      status: ATLASSIAN_COMPONENT_STATUS_MAP[c.status] ?? "unknown",
      description: c.description,
      groupName: c.group_id
        ? (data.components ?? []).find((g) => g.id === c.group_id)?.name ?? null
        : null,
    }));

  const activeIncident = (data.incidents ?? []).find(
    (i) => i.status !== "resolved" && i.status !== "postmortem",
  );

  return {
    overallStatus,
    description: data.status?.description ?? "",
    components,
    activeIncidentName: activeIncident?.name ?? null,
  };
}

type Parser = (url: string, config?: unknown) => Promise<ExternalStatusResult>;

const parsers: Record<string, Parser> = {
  atlassian: parseAtlassianStatuspage,
};

export async function checkExternalService(
  parserType: string,
  apiUrl: string,
  parserConfig?: unknown,
): Promise<ExternalStatusResult> {
  const parser = parsers[parserType];
  if (!parser) {
    return {
      overallStatus: "unknown",
      description: `Unsupported parser type: ${parserType}`,
      components: [],
      activeIncidentName: null,
    };
  }
  return parser(apiUrl, parserConfig);
}
