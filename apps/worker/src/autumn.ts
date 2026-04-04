import { Autumn } from "autumn-js";

const secretKey = process.env.AUTUMN_SECRET_KEY;

export const autumn = secretKey ? new Autumn({ secretKey }) : null;

export async function trackCheck(organizationId: string) {
  if (!autumn) {
    console.warn("[Autumn] No secret key — skipping check tracking");
    return;
  }
  try {
    const result = await autumn.track({
      customerId: organizationId,
      featureId: "checks",
      value: 1,
    });
    console.log(`[Autumn] tracked check for ${organizationId}`, JSON.stringify(result));
  } catch (e: any) {
    console.error("[Autumn] track check failed:", e?.statusCode, e?.message ?? e);
  }
}
