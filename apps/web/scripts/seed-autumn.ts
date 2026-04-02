import { Autumn } from "autumn-js";

const autumn = new Autumn({
  secretKey: process.env.AUTUMN_SECRET_KEY!,
});

const MODE = process.argv[2]; // "recreate-plans" to delete+recreate plans

const features = [
  { featureId: "custom_domains", name: "Custom Domains", type: "boolean" as const },
  { featureId: "custom_css", name: "Custom CSS", type: "boolean" as const },
  { featureId: "api_access", name: "API Access", type: "boolean" as const },
  { featureId: "auto_incidents", name: "Auto Incidents", type: "boolean" as const },
  { featureId: "remove_branding", name: "Remove Branding", type: "boolean" as const },
  { featureId: "multi_regions", name: "Multi-Regions", type: "boolean" as const },
  { featureId: "dependency_chain", name: "Dependency Chain", type: "boolean" as const },
  { featureId: "discord_notifications", name: "Discord Notifications", type: "boolean" as const },
  { featureId: "priority_support", name: "Priority Support", type: "boolean" as const },
  { featureId: "sla", name: "SLA", type: "boolean" as const },
];

async function run() {
  // Create features
  console.log("Creating features...");
  for (const f of features) {
    try {
      await autumn.features.create(f);
      console.log(`  ✓ ${f.name} (${f.featureId})`);
    } catch (e: any) {
      if (e?.statusCode === 409 || e?.message?.includes("already exists")) {
        console.log(`  ○ ${f.name} (already exists)`);
      } else {
        console.error(`  ✗ ${f.name}:`, e?.message ?? e);
      }
    }
  }

  // Delete plans first if recreating
  if (MODE === "recreate-plans") {
    console.log("\nDeleting existing plans...");
    try { await autumn.plans.delete({ planId: "pro" }); console.log("  ✓ Deleted pro"); } catch { console.log("  ○ pro (not found)"); }
    try { await autumn.plans.delete({ planId: "business" }); console.log("  ✓ Deleted business"); } catch { console.log("  ○ business (not found)"); }
  }

  // Create Pro plan (€18/mo)
  console.log("\nCreating Pro plan...");
  try {
    await autumn.plans.create({
      planId: "pro",
      name: "Pro",
      description: "For growing teams and projects",
      group: "main",
      price: { amount: 18, interval: "month" },
      items: [
        { featureId: "custom_domains" },
        { featureId: "custom_css" },
        { featureId: "api_access" },
        { featureId: "auto_incidents" },
        { featureId: "remove_branding" },
        { featureId: "multi_regions" },
        { featureId: "dependency_chain" },
        { featureId: "discord_notifications" },
      ],
    });
    console.log("  ✓ Pro (€18/mo)");
  } catch (e: any) {
    if (e?.statusCode === 409 || e?.message?.includes("already exists")) {
      console.log("  ○ Pro (already exists)");
    } else {
      console.error("  ✗ Pro:", e?.message ?? e);
    }
  }

  // Create Business plan (€48/mo)
  console.log("\nCreating Business plan...");
  try {
    await autumn.plans.create({
      planId: "business",
      name: "Business",
      description: "For teams that need more",
      group: "main",
      price: { amount: 48, interval: "month" },
      items: [
        { featureId: "custom_domains" },
        { featureId: "custom_css" },
        { featureId: "api_access" },
        { featureId: "auto_incidents" },
        { featureId: "remove_branding" },
        { featureId: "multi_regions" },
        { featureId: "dependency_chain" },
        { featureId: "discord_notifications" },
        { featureId: "priority_support" },
        { featureId: "sla" },
      ],
    });
    console.log("  ✓ Business (€48/mo)");
  } catch (e: any) {
    if (e?.statusCode === 409 || e?.message?.includes("already exists")) {
      console.log("  ○ Business (already exists)");
    } else {
      console.error("  ✗ Business:", e?.message ?? e);
    }
  }

  console.log("\nDone!");
}

run().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
