import { UnstatusApiError } from "./errors";
import type {
  ClientConfig,
  CreateIncidentInput,
  CreateMaintenanceInput,
  CreateMonitorInput,
  CreateNotificationInput,
  CreateStatusPageInput,
  DeleteResult,
  Incident,
  IncidentListItem,
  MaintenanceWindow,
  Monitor,
  MonitorCheck,
  MonitorRunResult,
  NotificationChannel,
  Organization,
  PaginatedResult,
  Pagination,
  PaginationParams,
  StatusPage,
  UnstatusClient,
  UpdateIncidentInput,
  UpdateMaintenanceInput,
  UpdateMonitorInput,
  UpdateNotificationInput,
  UpdateStatusPageInput,
} from "./types";

const DEFAULT_BASE_URL = "https://unstatus.app/api/v1";
const DEFAULT_USER_AGENT = "@unstatus/node-sdk";

type QueryValue = string | number | boolean | null | undefined;
type Query = Record<string, QueryValue>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
};

type DataEnvelope<T> = { data: T };
type PaginatedEnvelope<T> = { data: T[]; pagination: Pagination };

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string, query?: Query) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function toQuery(params?: PaginationParams): Query | undefined {
  if (!params) return undefined;
  return {
    limit: params.limit,
    offset: params.offset,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseErrorPayload(payload: unknown, status: number) {
  if (isObject(payload) && isObject(payload.error)) {
    const code = typeof payload.error.code === "string" ? payload.error.code : "API_ERROR";
    const message = typeof payload.error.message === "string" ? payload.error.message : `Request failed with status ${status}`;
    return { code, message };
  }

  if (typeof payload === "string" && payload.length > 0) {
    return { code: "API_ERROR", message: payload };
  }

  return { code: "API_ERROR", message: `Request failed with status ${status}` };
}

function createRequest(config: ClientConfig) {
  const fetchImpl = config.fetch ?? globalThis.fetch;
  const baseUrl = normalizeBaseUrl(config.baseUrl ?? DEFAULT_BASE_URL);
  const userAgent = config.userAgent ?? DEFAULT_USER_AGENT;

  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation available. Pass `fetch` in createClient() or use Node 18+.");
  }

  async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(baseUrl, path, options.query);
    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "User-Agent": userAgent,
    });

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (error) {
      throw new UnstatusApiError("Network request failed", 0, "NETWORK_ERROR", undefined, { cause: error });
    }

    const contentType = response.headers.get("content-type");
    let payload: unknown = undefined;

    if (contentType?.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text.length > 0 ? text : undefined;
    }

    if (!response.ok) {
      const { code, message } = parseErrorPayload(payload, response.status);
      throw new UnstatusApiError(message, response.status, code, payload);
    }

    return payload as T;
  }

  async function request<T>(path: string, options?: RequestOptions) {
    const payload = await send<DataEnvelope<T>>(path, options);
    return payload.data;
  }

  async function list<T>(path: string, query?: Query): Promise<PaginatedResult<T>> {
    const payload = await send<PaginatedEnvelope<T>>(path, { query });
    return {
      items: payload.data,
      pagination: payload.pagination,
    };
  }

  return {
    request,
    list,
  };
}

export function createClient(config: ClientConfig): UnstatusClient {
  const http = createRequest(config);

  return {
    monitors: {
      list(params?: PaginationParams) {
        return http.list<Monitor>("/monitors", toQuery(params));
      },
      get(id: string) {
        return http.request<Monitor>(`/monitors/${id}`);
      },
      create(input: CreateMonitorInput) {
        return http.request<Monitor>("/monitors", { method: "POST", body: input });
      },
      update(id: string, input: UpdateMonitorInput) {
        return http.request<Monitor>(`/monitors/${id}`, { method: "PATCH", body: input });
      },
      delete(id: string) {
        return http.request<DeleteResult>(`/monitors/${id}`, { method: "DELETE" });
      },
      listChecks(id: string, params?: PaginationParams) {
        return http.list<MonitorCheck>(`/monitors/${id}/checks`, toQuery(params));
      },
      run(id: string) {
        return http.request<MonitorRunResult>(`/monitors/${id}/run`, { method: "POST" });
      },
    },
    incidents: {
      list(params?: PaginationParams) {
        return http.list<IncidentListItem>("/incidents", toQuery(params));
      },
      get(id: string) {
        return http.request<Incident>(`/incidents/${id}`);
      },
      create(input: CreateIncidentInput) {
        return http.request<Incident>("/incidents", { method: "POST", body: input });
      },
      update(id: string, input: UpdateIncidentInput) {
        return http.request<Incident>(`/incidents/${id}`, { method: "PATCH", body: input });
      },
      delete(id: string) {
        return http.request<DeleteResult>(`/incidents/${id}`, { method: "DELETE" });
      },
    },
    statusPages: {
      list(params?: PaginationParams) {
        return http.list<StatusPage>("/status-pages", toQuery(params));
      },
      get(id: string) {
        return http.request<StatusPage>(`/status-pages/${id}`);
      },
      create(input: CreateStatusPageInput) {
        return http.request<StatusPage>("/status-pages", { method: "POST", body: input });
      },
      update(id: string, input: UpdateStatusPageInput) {
        return http.request<StatusPage>(`/status-pages/${id}`, { method: "PATCH", body: input });
      },
      delete(id: string) {
        return http.request<DeleteResult>(`/status-pages/${id}`, { method: "DELETE" });
      },
    },
    maintenance: {
      list(params?: PaginationParams) {
        return http.list<MaintenanceWindow>("/maintenance", toQuery(params));
      },
      get(id: string) {
        return http.request<MaintenanceWindow>(`/maintenance/${id}`);
      },
      create(input: CreateMaintenanceInput) {
        return http.request<MaintenanceWindow>("/maintenance", { method: "POST", body: input });
      },
      update(id: string, input: UpdateMaintenanceInput) {
        return http.request<MaintenanceWindow>(`/maintenance/${id}`, { method: "PATCH", body: input });
      },
      delete(id: string) {
        return http.request<DeleteResult>(`/maintenance/${id}`, { method: "DELETE" });
      },
      start(id: string) {
        return http.request<MaintenanceWindow>(`/maintenance/${id}/start`, { method: "POST" });
      },
      complete(id: string) {
        return http.request<MaintenanceWindow>(`/maintenance/${id}/complete`, { method: "POST" });
      },
      cancel(id: string) {
        return http.request<MaintenanceWindow>(`/maintenance/${id}/cancel`, { method: "POST" });
      },
    },
    notifications: {
      list(params?: PaginationParams) {
        return http.list<NotificationChannel>("/notifications", toQuery(params));
      },
      create(input: CreateNotificationInput) {
        return http.request<NotificationChannel>("/notifications", { method: "POST", body: input });
      },
      update(id: string, input: UpdateNotificationInput) {
        return http.request<NotificationChannel>(`/notifications/${id}`, { method: "PATCH", body: input });
      },
      delete(id: string) {
        return http.request<DeleteResult>(`/notifications/${id}`, { method: "DELETE" });
      },
    },
    organization: {
      get() {
        return http.request<Organization>("/organization");
      },
    },
  };
}
