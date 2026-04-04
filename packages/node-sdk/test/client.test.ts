import { describe, expect, it, vi } from "vitest";
import { UnstatusApiError, createClient } from "../src";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    status: init?.status,
    statusText: init?.statusText,
  });
}

describe("@unstatus/node-sdk", () => {
  it("injects auth headers and unwraps list responses", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain("https://status.example/api/v1/monitors?limit=5");
      expect(init?.headers).toBeInstanceOf(Headers);

      const headers = init?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer usk_test");
      expect(headers.get("User-Agent")).toBe("@unstatus/node-sdk");

      return jsonResponse({
        data: [{ id: "mon_1", name: "API" }],
        pagination: { total: 1, limit: 5, offset: 0, hasMore: false },
      });
    });

    const client = createClient({
      apiKey: "usk_test",
      baseUrl: "https://status.example/api/v1/",
      fetch: fetchMock as typeof fetch,
    });

    const result = await client.monitors.list({ limit: 5 });
    expect(result.items).toEqual([{ id: "mon_1", name: "API" }]);
    expect(result.pagination.total).toBe(1);
  });

  it("serializes mutation bodies and unwraps data responses", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ name: "API", type: "http", url: "https://api.example.com" }));

      return jsonResponse({
        data: {
          id: "mon_1",
          name: "API",
          type: "http",
        },
      }, { status: 201 });
    });

    const client = createClient({ apiKey: "usk_test", fetch: fetchMock as typeof fetch });
    const monitor = await client.monitors.create({ name: "API", type: "http", url: "https://api.example.com" });

    expect(monitor.id).toBe("mon_1");
    expect(monitor.type).toBe("http");
  });

  it("maps API errors to UnstatusApiError", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: { code: "BAD_REQUEST", message: "title: Too small" } },
        { status: 400 },
      ));

    const client = createClient({ apiKey: "usk_test", fetch: fetchMock as typeof fetch });

    await expect(client.incidents.create({
      monitorIds: [],
      title: "",
      message: "",
    })).rejects.toMatchObject<Partial<UnstatusApiError>>({
      name: "UnstatusApiError",
      status: 400,
      code: "BAD_REQUEST",
      message: "title: Too small",
    });
  });

  it("wraps transport failures as UnstatusApiError", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("boom");
    });

    const client = createClient({ apiKey: "usk_test", fetch: fetchMock as typeof fetch });
    await expect(client.organization.get()).rejects.toMatchObject<Partial<UnstatusApiError>>({
      name: "UnstatusApiError",
      status: 0,
      code: "NETWORK_ERROR",
      message: "Network request failed",
    });
  });

  it("supports maintenance action routes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/maintenance/mw_1/start");
      expect(init?.method).toBe("POST");

      return jsonResponse({
        data: {
          id: "mw_1",
          title: "Upgrade",
          status: "in_progress",
          monitors: [],
        },
      });
    });

    const client = createClient({ apiKey: "usk_test", fetch: fetchMock as typeof fetch });
    const window = await client.maintenance.start("mw_1");
    expect(window.status).toBe("in_progress");
  });
});
