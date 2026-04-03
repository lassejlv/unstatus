import { Autumn } from "autumn-js";

const secretKey = process.env.AUTUMN_SECRET_KEY;

export const autumn = secretKey ? new Autumn({ secretKey }) : null;

export async function trackCheck(organizationId: string) {
  if (!autumn) return;
  try {
    await autumn.track({
      customerId: organizationId,
      featureId: "checks",
      value: 1,
    });
  } catch (e) {
    // Non-blocking — don't let tracking failures break monitor checks
    console.error("[Autumn] track check failed:", e);
  }
}
