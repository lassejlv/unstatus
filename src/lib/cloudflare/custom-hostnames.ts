import { env } from "@/lib/env";
import { normalizeHostname } from "@/lib/hostnames";

type CloudflareResponse<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string }>;
  result: T;
};

type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status: string;
  verification_errors?: string[];
  ownership_verification?: {
    type?: string;
    name?: string;
    value?: string;
  } | null;
  ownership_verification_http?: {
    http_url?: string;
    http_body?: string;
  } | null;
  ssl?: {
    id?: string;
    status?: string;
    method?: string;
    type?: string;
    bundle_method?: string;
    wildcard?: boolean;
    validation_errors?: Array<{ message?: string }>;
    validation_records?: Array<{
      status?: string;
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
      emails?: string[];
    }>;
  } | null;
};

export type CustomDomainStatus = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string | null;
  verificationErrors: string[];
  ownershipVerification:
    | {
        type: string | null;
        name: string | null;
        value: string | null;
      }
    | null;
  ownershipVerificationHttp:
    | {
        url: string | null;
        body: string | null;
      }
    | null;
  validationRecords: Array<{
    status: string | null;
    txtName: string | null;
    txtValue: string | null;
    httpUrl: string | null;
    httpBody: string | null;
    emails: string[];
  }>;
};

function assertCloudflareConfigured() {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ZONE_ID) {
    throw new Error("Cloudflare custom domains are not configured.");
  }
}

function getCloudflareApiUrl(path: string) {
  assertCloudflareConfigured();
  return `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}${path}`;
}

async function cloudflareFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(getCloudflareApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const json = (await response.json()) as CloudflareResponse<T>;

  if (!response.ok || !json.success) {
    const messages = [
      ...(json.errors ?? []).map((error) => error.message).filter(Boolean),
      ...(json.messages ?? []).map((message) => message.message).filter(Boolean),
    ];

    throw new Error(messages[0] ?? "Cloudflare request failed.");
  }

  return json.result;
}

function mapCustomHostname(hostname: CloudflareCustomHostname): CustomDomainStatus {
  return {
    id: hostname.id,
    hostname: hostname.hostname,
    status: hostname.status,
    sslStatus: hostname.ssl?.status ?? null,
    verificationErrors: [
      ...(hostname.verification_errors ?? []),
      ...((hostname.ssl?.validation_errors ?? []).map((error) => error.message).filter(Boolean) as string[]),
    ],
    ownershipVerification: hostname.ownership_verification
      ? {
          type: hostname.ownership_verification.type ?? null,
          name: hostname.ownership_verification.name ?? null,
          value: hostname.ownership_verification.value ?? null,
        }
      : null,
    ownershipVerificationHttp: hostname.ownership_verification_http
      ? {
          url: hostname.ownership_verification_http.http_url ?? null,
          body: hostname.ownership_verification_http.http_body ?? null,
        }
      : null,
    validationRecords: (hostname.ssl?.validation_records ?? []).map((record) => ({
      status: record.status ?? null,
      txtName: record.txt_name ?? null,
      txtValue: record.txt_value ?? null,
      httpUrl: record.http_url ?? null,
      httpBody: record.http_body ?? null,
      emails: record.emails ?? [],
    })),
  };
}

export async function findCustomHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return null;

  const result = await cloudflareFetch<CloudflareCustomHostname[]>(
    `/custom_hostnames?hostname=${encodeURIComponent(normalized)}`,
  );

  const match = result.find(
    (entry) => normalizeHostname(entry.hostname) === normalized,
  );

  return match ? mapCustomHostname(match) : null;
}

export async function createCustomHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const existing = await findCustomHostname(normalized);

  if (existing) {
    return existing;
  }

  const result = await cloudflareFetch<CloudflareCustomHostname>(
    "/custom_hostnames",
    {
      method: "POST",
      body: JSON.stringify({
        hostname: normalized,
        ssl: {
          method: "http",
          type: "dv",
          bundle_method: "ubiquitous",
          wildcard: false,
          settings: {
            http2: "on",
            min_tls_version: "1.2",
            tls_1_3: "on",
          },
        },
      }),
    },
  );

  return mapCustomHostname(result);
}

export async function getCustomHostnameStatus(hostname: string) {
  return findCustomHostname(hostname);
}

export async function deleteCustomHostname(hostname: string) {
  const existing = await findCustomHostname(hostname);
  if (!existing) return;

  await cloudflareFetch<unknown>(`/custom_hostnames/${existing.id}`, {
    method: "DELETE",
  });
}
