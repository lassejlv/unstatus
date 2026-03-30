# Plan: Cloudflare for SaaS custom domains for status pages

## Goal

Let a status page be reachable on a customer subdomain like:

- `https://status.theirsite.com/`
- `https://status.theirsite.com/incidents/<incidentId>`

while keeping the existing fallback routes working:

- `/status/<slug>`
- `/status/<slug>/<incidentId>`

---

## What already exists in this repo

Relevant pieces already in place:

- Public status pages live at `src/routes/status/$slug/index.tsx`
- Public incident pages live at `src/routes/status/$slug/$incidentId.tsx`
- Public data is resolved in `src/orpc/router/public-status.ts`
- Status page management UI is in `src/routes/_authed/dashboard/status-pages/$pageId.tsx`
- Prisma already has `StatusPage.customDomain` in `prisma/schema.prisma`

So the missing part is not the status page itself — it is the **custom domain lifecycle + host-based routing + dashboard UX**.

---

## Recommended architecture

### Recommendation for v1

Use **Cloudflare for SaaS Custom Hostnames** for:

- customer hostname onboarding
- SSL certificate issuance
- DNS validation / ownership validation
- routing traffic from `status.theirsite.com` to our app origin

But **do not use a Worker for path rewriting in v1**.

Instead:

- Cloudflare forwards the request to our existing app origin
- our app resolves the status page from the incoming hostname (`Host` / `X-Forwarded-Host`)
- the app renders the public status page at `/`
- the app renders incidents at `/incidents/$incidentId`

### Why this is the best fit here

Because today the app is already structured around rendering the status page in React/TanStack Start, and the clean custom-domain URL should be `/`, not `/status/<slug>`.

If we used a Worker to rewrite `/` -> `/status/<slug>`, we would still have to fix generated links and canonical URLs. Letting the app resolve by host keeps the URL model clean and avoids a rewrite layer we do not need yet.

---

## v1 scope

Ship this first:

- support **one custom domain per status page**
- support **subdomains only** (`status.theirsite.com`)
- **do not support apex domains** (`theirsite.com`) in v1
- only allow custom domains on **public** status pages
- keep `/status/<slug>` routes working as fallback forever
- use **manual refresh + polling** for domain activation state first
- treat Cloudflare webhooks as phase 2 polish

### Why subdomains only first

Cloudflare apex proxying is a separate concern and adds more operational complexity. The user asked for `status.theirsite.com`, which fits the simpler and more common `CNAME` flow.

---

## High-level flow

1. User opens a status page in the dashboard.
2. User enters `status.theirsite.com`.
3. Backend validates it and creates a Cloudflare custom hostname.
4. Backend stores Cloudflare metadata on the status page.
5. UI shows the required DNS records:
   - CNAME target to our Cloudflare SaaS target
   - ownership/DCV records returned by Cloudflare
6. User adds the DNS records at their DNS provider.
7. We poll/refresh Cloudflare until the hostname and SSL status are active.
8. Once active, requests to `https://status.theirsite.com/` resolve the page by hostname.
9. Dashboard “View” button opens the custom domain instead of `/status/<slug>`.

---

## Cloudflare side setup

## 1) Create a dedicated SaaS zone

Use a dedicated hostname target for custom domains, not the main marketing hostname.

Example:

- customer points `status.theirsite.com`
- to `edge.unstatus.app` (or similar)

This should live on a Cloudflare-managed zone that has Cloudflare for SaaS enabled.

### Why use a dedicated target

It separates:

- marketing/app hostnames
- origin hostnames
- customer vanity domains

and makes rollout safer.

---

## 2) Enable Cloudflare for SaaS / Custom Hostnames

In Cloudflare:

- enable **Cloudflare for SaaS** on the chosen zone
- configure the **fallback origin** to the existing application origin
- use the **Custom Hostnames API** to create/update/delete customer hostnames

We should explicitly store the provider target we ask customers to CNAME to, e.g.:

- `edge.unstatus.app`

---

## 3) Validation approach

For v1, use a flow that surfaces exactly what Cloudflare returns and makes no hidden assumptions.

Recommended:

- create the custom hostname through Cloudflare API
- return and store:
  - `ownership_verification`
  - `ownership_verification_http` if present
  - `ssl.validation_records`
  - hostname status
  - SSL status
  - verification errors

In the UI, show the customer the exact DNS records to add.

### Notes from Cloudflare docs relevant to this plan

- custom hostnames move through statuses like `pending`, `active`, `moved`, `blocked`
- SSL status has separate phases like `pending_validation`, `pending_issuance`, `pending_deployment`, `active`
- Cloudflare documents a default rate limit of **15 successful certificate submissions per minute**

That means we should surface states cleanly and not pretend activation is instant.

---

## App/data model changes

We already have `StatusPage.customDomain`. That is not enough for a real lifecycle.

### Recommended schema additions

Keep `customDomain` on `StatusPage`, and add fields like:

- `customDomainStatus` – app-level status (`none`, `pending`, `active`, `error`, `removed`)
- `customDomainCloudflareId` – Cloudflare custom hostname ID
- `customDomainSslStatus` – latest SSL status from Cloudflare
- `customDomainVerificationErrors` – latest Cloudflare errors/messages
- `customDomainLastCheckedAt`
- `customDomainActivatedAt`
- `customDomainOwnership` – optional JSON blob for TXT/http instructions
- `customDomainValidationRecords` – optional JSON blob for ACME/DCV instructions

### Why not create a new table in v1?

Because the product currently models a single `customDomain` on `StatusPage`, so extending that model is the fastest path.

If later we want multiple aliases per page, redirects, or staging domains, then split it into a `StatusPageDomain` model.

---

## New env vars

Add these in `src/lib/env.ts`:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_ACCOUNT_ID` (optional but useful)
- `CLOUDFLARE_SAAS_TARGET`
- `PLATFORM_HOSTS` – comma-separated list of our own hosts
- `APP_ORIGIN` – the real app origin Cloudflare forwards to
- `CLOUDFLARE_WEBHOOK_SECRET` (phase 2)

### Why `PLATFORM_HOSTS` matters

The root route `/` already serves the marketing homepage on our own host.
We need to distinguish:

- `unstatus.com`, `www.unstatus.com`, localhost, preview hosts => marketing/product app
- `status.theirsite.com` => public status page host

---

## New server-side helpers

Create a small domain/hostname utility module, e.g.:

- `src/lib/hostnames.ts`

It should do:

- normalize hostnames to lowercase
- strip ports
- prefer `x-forwarded-host` and fall back to `host`
- reject invalid input
- detect platform hosts (`isPlatformHost(host)`)
- optionally enforce “subdomain only” for v1

Also create a Cloudflare API wrapper, e.g.:

- `src/lib/cloudflare/custom-hostnames.ts`

Functions:

- `createCustomHostname(hostname, metadata)`
- `getCustomHostname(id)`
- `refreshCustomHostnameValidation(id)`
- `deleteCustomHostname(id)`

Use plain `fetch`; no SDK required.

---

## Backend/API plan

## 1) Extend `statusPages` router

File:

- `src/orpc/router/status-pages.ts`

Add dedicated domain lifecycle procedures instead of burying this in the generic `update` mutation.

### New procedures

- `attachCustomDomain`
  - input: `{ pageId, hostname }`
  - validates hostname
  - checks page belongs to active org
  - checks hostname is not already used
  - creates Cloudflare custom hostname
  - stores Cloudflare ID + status + verification data
  - returns DNS instructions

- `refreshCustomDomain`
  - input: `{ pageId }`
  - fetches current Cloudflare status
  - updates DB
  - returns latest status/errors

- `removeCustomDomain`
  - input: `{ pageId }`
  - deletes Cloudflare custom hostname
  - clears local fields

- optionally `retryCustomDomainValidation`
  - triggers Cloudflare validation refresh/PATCH when stuck

### Important security checks

For these mutations:

- verify the page belongs to the user’s org
- reject platform-owned hostnames
- reject apex/root domains in v1
- reject duplicates across all status pages
- reject attaching a custom domain to a non-public page

---

## 2) Extend `publicStatus` router

File:

- `src/orpc/router/public-status.ts`

Right now it resolves by slug only.

Refactor it so the core resolver can work by either:

- `slug`
- `host`

### Suggested shape

Keep the existing slug methods, but add:

- `getByHost`
- `getIncidentByHost`

Internally, create shared helpers like:

- `resolvePublicPageBySlug(slug)`
- `resolvePublicPageByHost(host)`
- `getPublicStatusPage(page)`
- `getPublicIncidentPage(page, incidentId)`

### Important behavior

When resolving by host:

- normalize hostname first
- look up `statusPage.customDomain`
- only return a page if the status is active
- still require `isPublic === true`

---

## Routing plan

## Keep the existing slug routes

No breaking change:

- `src/routes/status/$slug/index.tsx`
- `src/routes/status/$slug/$incidentId.tsx`

These remain as fallback/public share URLs.

---

## Add host-based public routes

### 1) Root route `/`

File to update:

- `src/routes/index.tsx`

Current behavior:

- always renders the marketing homepage

New behavior:

- on platform hosts => render marketing homepage
- on active custom domain => render the public status page for that host

### Important implementation detail

This decision should happen **server-side**, not only in a client `useEffect`, because:

- we need access to request headers
- we want correct SSR/initial HTML
- we do not want to hydrate the marketing homepage and then swap to a status page

So the root route should use a server-side loader/server function that checks the host before render.

---

### 2) Incident route on custom domains

Add a new public route:

- `src/routes/incidents/$incidentId.tsx`

Behavior:

- on custom domain host => resolve page by host, then incident by `incidentId`
- on platform host => 404 or not-found

### Why `/incidents/$incidentId`?

Because it is clear and avoids collisions with future pages.
A bare `/$incidentId` route would be messy and conflict-prone.

---

## Link generation rules

Update public status rendering so links depend on access mode:

- slug mode => link to `/status/$slug/$incidentId`
- custom-domain mode => link to `/incidents/$incidentId`

This mostly affects:

- `src/components/public-status-view.tsx`
- the two public route files

---

## Guarding non-status routes on custom domains

We should not serve the normal product site under customer domains.

Desired behavior on a custom domain host:

- `/` => status page
- `/incidents/$incidentId` => incident page
- framework assets/API internals => allowed as needed
- everything else => 404

This avoids weird outcomes like:

- `https://status.theirsite.com/login`
- `https://status.theirsite.com/pricing`

showing Unstatus product pages under the customer’s domain.

---

## Dashboard/UI plan

## Add a “Custom domain” card to the status page detail screen

File:

- `src/routes/_authed/dashboard/status-pages/$pageId.tsx`

Do **not** hide this inside the tiny edit modal. Make it a visible section on the page.

### The card should include

- current custom domain value
- input for a new hostname
- activation status badge
- CNAME target to copy
- any TXT/DCV records to copy
- latest verification errors from Cloudflare
- buttons:
  - Connect domain
  - Refresh status
  - Remove domain
  - View live page

### Status labels we should show clearly

User-friendly labels mapped from Cloudflare state, e.g.:

- `Pending DNS setup`
- `Pending validation`
- `Issuing certificate`
- `Deploying certificate`
- `Active`
- `Needs attention`

Always also store/display raw Cloudflare messages for support/debugging.

---

## View URL behavior

Update the dashboard “View” button and displayed public URL:

- if active custom domain exists => open `https://<customDomain>`
- otherwise => open `/status/<slug>`

This affects the current logic in:

- `src/routes/_authed/dashboard/status-pages/$pageId.tsx`

---

## Suggested implementation order

## Phase 1 — foundation

1. Add env vars to `src/lib/env.ts`
2. Add `src/lib/hostnames.ts`
3. Add `src/lib/cloudflare/custom-hostnames.ts`
4. Extend Prisma model with Cloudflare lifecycle fields
5. Extend `statusPages` router with domain mutations

### Done when

- a status page can store pending custom-domain metadata
- dashboard can create/delete/refresh a Cloudflare custom hostname
- DNS instructions can be displayed

---

## Phase 2 — host-based public routing

1. Refactor `src/orpc/router/public-status.ts` to support lookup by host
2. Update `src/routes/index.tsx` to render status page on custom domain hosts
3. Add `src/routes/incidents/$incidentId.tsx`
4. Update link generation in `src/components/public-status-view.tsx`
5. Add route guarding for non-status pages on custom domains

### Done when

- `https://status.theirsite.com/` renders the correct page
- incident links stay on the custom domain
- product pages are not exposed under the customer host

---

## Phase 3 — dashboard polish

1. Add a proper custom-domain section in the status page detail page
2. Show exact DNS instructions and copy buttons
3. Add refresh/remove/retry flows
4. Make “View” use the custom domain when active

### Done when

- a non-technical user can connect a domain from the dashboard without support help

---

## Phase 4 — operational polish

Optional but recommended after v1:

1. Add Cloudflare webhook endpoint for activation/failure events
2. Store latest webhook state in DB
3. Add audit logging for attach/remove actions
4. Add retries/backoff for Cloudflare API failures
5. Add alerting if hostnames move to `moved`/`blocked`

---

## Testing plan

## Unit tests

Add tests for:

- hostname normalization
- platform-host detection
- subdomain-only validation
- duplicate-domain rejection
- link generation mode switching

## Integration tests

Mock Cloudflare API and test:

- attach domain success
- attach domain duplicate
- refresh status updates DB correctly
- remove domain cleans local state
- host-based public lookup only returns active + public pages

## Manual staging test

Use a real test subdomain and verify:

1. create custom hostname
2. add DNS records
3. status moves to active
4. root page loads on custom host
5. incident links stay on custom host
6. `/login` and `/pricing` do not show product pages on the custom host

---

## Edge cases to handle

- customer enters uppercase hostname
- customer enters hostname with a trailing dot
- customer enters an apex/root domain in v1
- customer tries to reuse a domain already attached elsewhere
- customer removes a domain and re-adds it later
- status page is made private while custom domain exists
- status page is deleted while Cloudflare hostname still exists
- hostname is `moved` or `blocked` in Cloudflare
- origin accidentally redirects custom domains back to app domain

### Specific cleanup rule

When deleting a status page, do a best-effort delete of the Cloudflare custom hostname too, so we do not leave orphaned hostnames behind.

---

## Open questions before building

1. Which exact hostname should be the Cloudflare SaaS target?
   - example: `edge.unstatus.app`

2. What is the stable production origin Cloudflare should forward to?
   - must be a host that does not force redirects back to the marketing domain

3. Do we want TXT-based prevalidation first, or the simplest CNAME-first setup?
   - v1 can still surface whatever Cloudflare returns, but we should decide which path the UI emphasizes

4. Do we want a webhook in v1, or is manual refresh enough?
   - my recommendation: manual refresh first, webhook second

---

## Final recommendation in one sentence

**Use Cloudflare for SaaS Custom Hostnames to terminate TLS and route customer subdomains to the existing app origin, then make the app resolve public status pages by request hostname so `status.theirsite.com` serves the page at `/` while `/status/<slug>` remains the fallback URL.**
