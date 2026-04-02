import { createPrismaClient } from "../index";

const prisma = createPrismaClient(process.env.DATABASE_URL!);

const services = [
  // Hosting
  { name: "Vercel", slug: "vercel", category: "hosting", website: "https://vercel.com", statusPageUrl: "https://www.vercel-status.com", statusPageApiUrl: "https://www.vercel-status.com/api/v2/summary.json" },
  { name: "Netlify", slug: "netlify", category: "hosting", website: "https://www.netlify.com", statusPageUrl: "https://www.netlifystatus.com", statusPageApiUrl: "https://www.netlifystatus.com/api/v2/summary.json" },
  { name: "Render", slug: "render", category: "hosting", website: "https://render.com", statusPageUrl: "https://status.render.com", statusPageApiUrl: "https://status.render.com/api/v2/summary.json" },
  { name: "Railway", slug: "railway", category: "hosting", website: "https://railway.app", statusPageUrl: "https://status.railway.app", statusPageApiUrl: "https://status.railway.app/api/v2/summary.json" },
  { name: "Fly.io", slug: "flyio", category: "hosting", website: "https://fly.io", statusPageUrl: "https://status.flyio.net", statusPageApiUrl: "https://status.flyio.net/api/v2/summary.json" },

  // Cloud (AWS/GCP/Azure don't use Atlassian Statuspage)
  { name: "AWS", slug: "aws", category: "cloud", website: "https://aws.amazon.com", statusPageUrl: "https://health.aws.amazon.com/health/status", statusPageApiUrl: null },
  { name: "Google Cloud", slug: "gcp", category: "cloud", website: "https://cloud.google.com", statusPageUrl: "https://status.cloud.google.com", statusPageApiUrl: null },
  { name: "Azure", slug: "azure", category: "cloud", website: "https://azure.microsoft.com", statusPageUrl: "https://azure.status.microsoft.com", statusPageApiUrl: null },
  { name: "DigitalOcean", slug: "digitalocean", category: "cloud", website: "https://www.digitalocean.com", statusPageUrl: "https://status.digitalocean.com", statusPageApiUrl: "https://status.digitalocean.com/api/v2/summary.json" },

  // CDN / DNS
  { name: "Cloudflare", slug: "cloudflare", category: "cdn", website: "https://www.cloudflare.com", statusPageUrl: "https://www.cloudflarestatus.com", statusPageApiUrl: "https://www.cloudflarestatus.com/api/v2/summary.json" },
  { name: "Fastly", slug: "fastly", category: "cdn", website: "https://www.fastly.com", statusPageUrl: "https://status.fastly.com", statusPageApiUrl: null }, // blocks API access (403)

  // Database
  { name: "PlanetScale", slug: "planetscale", category: "database", website: "https://planetscale.com", statusPageUrl: "https://www.planetscalestatus.com", statusPageApiUrl: "https://www.planetscalestatus.com/api/v2/summary.json" },
  { name: "Supabase", slug: "supabase", category: "database", website: "https://supabase.com", statusPageUrl: "https://status.supabase.com", statusPageApiUrl: "https://status.supabase.com/api/v2/summary.json" },
  { name: "MongoDB Atlas", slug: "mongodb-atlas", category: "database", website: "https://www.mongodb.com/atlas", statusPageUrl: "https://status.mongodb.com", statusPageApiUrl: "https://status.mongodb.com/api/v2/summary.json" },
  { name: "Neon", slug: "neon", category: "database", website: "https://neon.tech", statusPageUrl: "https://neonstatus.com", statusPageApiUrl: null }, // not Atlassian (404)
  { name: "Upstash", slug: "upstash", category: "database", website: "https://upstash.com", statusPageUrl: "https://status.upstash.com", statusPageApiUrl: "https://status.upstash.com/api/v2/summary.json" },

  // DevTools
  { name: "GitHub", slug: "github", category: "devtools", website: "https://github.com", statusPageUrl: "https://www.githubstatus.com", statusPageApiUrl: "https://www.githubstatus.com/api/v2/summary.json" },
  { name: "GitLab", slug: "gitlab", category: "devtools", website: "https://gitlab.com", statusPageUrl: "https://status.gitlab.com", statusPageApiUrl: null }, // not Atlassian (404)
  { name: "NPM", slug: "npm", category: "devtools", website: "https://www.npmjs.com", statusPageUrl: "https://status.npmjs.org", statusPageApiUrl: "https://status.npmjs.org/api/v2/summary.json" },
  { name: "Docker Hub", slug: "docker", category: "devtools", website: "https://hub.docker.com", statusPageUrl: "https://www.dockerstatus.com", statusPageApiUrl: null }, // not Atlassian (404)

  // Payments
  { name: "Stripe", slug: "stripe", category: "payments", website: "https://stripe.com", statusPageUrl: "https://status.stripe.com", statusPageApiUrl: null }, // not Atlassian (404)

  // Communication
  { name: "Twilio", slug: "twilio", category: "communication", website: "https://www.twilio.com", statusPageUrl: "https://status.twilio.com", statusPageApiUrl: "https://status.twilio.com/api/v2/summary.json" },
  { name: "SendGrid", slug: "sendgrid", category: "communication", website: "https://sendgrid.com", statusPageUrl: "https://status.sendgrid.com", statusPageApiUrl: "https://status.sendgrid.com/api/v2/summary.json" },
  { name: "Resend", slug: "resend", category: "communication", website: "https://resend.com", statusPageUrl: "https://resend-status.com", statusPageApiUrl: "https://resend-status.com/api/v2/summary.json" },

  // Auth
  { name: "Auth0", slug: "auth0", category: "auth", website: "https://auth0.com", statusPageUrl: "https://status.auth0.com", statusPageApiUrl: null }, // not Atlassian (404)
  { name: "Clerk", slug: "clerk", category: "auth", website: "https://clerk.com", statusPageUrl: "https://status.clerk.com", statusPageApiUrl: "https://status.clerk.com/api/v2/summary.json" },

  // AI / API
  { name: "OpenAI", slug: "openai", category: "api", website: "https://openai.com", statusPageUrl: "https://status.openai.com", statusPageApiUrl: "https://status.openai.com/api/v2/summary.json" },
  { name: "Anthropic", slug: "anthropic", category: "api", website: "https://anthropic.com", statusPageUrl: "https://status.anthropic.com", statusPageApiUrl: "https://status.anthropic.com/api/v2/summary.json" },
] as const;

async function seed() {
  console.log("Seeding external services...");

  for (const service of services) {
    await prisma.externalService.upsert({
      where: { slug: service.slug },
      create: {
        name: service.name,
        slug: service.slug,
        category: service.category,
        website: service.website,
        statusPageUrl: service.statusPageUrl,
        statusPageApiUrl: service.statusPageApiUrl ?? null,
        parserType: "atlassian",
        active: service.statusPageApiUrl != null,
      },
      update: {
        name: service.name,
        category: service.category,
        website: service.website,
        statusPageUrl: service.statusPageUrl,
        statusPageApiUrl: service.statusPageApiUrl ?? null,
        parserType: "atlassian",
        active: service.statusPageApiUrl != null,
      },
    });
    console.log(`  ${service.statusPageApiUrl ? "✓" : "○"} ${service.name}${service.statusPageApiUrl ? "" : " (no API — display only)"}`);
  }

  console.log(`\nSeeded ${services.length} external services.`);
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
