# Unstatus Roadmap

> Where we're headed. This is a living document — priorities shift based on feedback and needs.

## Now — Active Development

Features currently being worked on or planned for the immediate next release.

- [ ] **SSL certificate monitoring** — Track cert expiry and alert before expiration
- [ ] **Keyword/assertion checks** — Validate response body contains expected content
- [ ] **Maintenance windows** — Schedule and display upcoming maintenance on status pages
- [ ] **Status page widgets** — Embeddable status badges for external sites
- [ ] **API keys** — Generate keys for programmatic access to the API

## Next — Near Term

Planned for the next 2-3 months.

- [ ] **More notification channels** — Slack, PagerDuty, Opsgenie webhooks
- [ ] **Incident postmortems** — Built-in templates and workflows for post-incident reviews
- [ ] **Private status pages** — Password-protected or IP-restricted pages
- [ ] **Advanced check configuration** — Retry policies, degraded thresholds, custom regions
- [ ] **Team management improvements** — Transfer ownership, audit logs
- [ ] **Terraform provider** — Infrastructure-as-code for status page setup

## Later — Future Ideas

Exploratory features and larger initiatives.

- [ ] **Synthetic monitoring** — Browser-based checks with Playwright/Puppeteer
- [ ] **SAML/SSO** — Enterprise authentication (Okta, Azure AD, etc.)
- [ ] **Status page API v2** — Full CRUD for managing services and incidents via API
- [ ] **Third-party integrations** — Datadog, GitHub, Vercel status imports
- [ ] **Mobile app** — iOS/Android apps for on-the-go incident management
- [ ] **Self-hosted version** — One-click Docker deployment for on-premise

## Infrastructure & Polish

Behind-the-scenes improvements that make the platform better.

- [ ] **WebSocket real-time updates** — Live incident updates on status pages without refresh
- [ ] **Worker auto-scaling** — Dynamic worker pools based on check volume
- [ ] **Global latency heatmaps** — Visualize response times by region
- [ ] **Check result retention policies** — Configurable data retention per plan
- [ ] **Better error tracking** — Sentry integration for catching bugs
- [ ] **Rate limiting improvements** — Smarter limits per endpoint per organization
- [ ] **Database performance** — Query optimization, index review, archiving old data

## Completed ✅

Shipped features — the foundation is solid.

### Core Platform
- [x] User authentication (Google OAuth via Better Auth)
- [x] Organization management with billing (Polar.sh integration)
- [x] Team invitations with role-based access (owner/admin/member)
- [x] Public API (oRPC-based type-safe API)

### Monitoring
- [x] HTTP/HTTPS health checks with configurable intervals
- [x] TCP port monitoring
- [x] Multi-region workers (EU, US, Asia support)
- [x] Response time tracking and rollups (hourly/daily aggregates)
- [x] Auto-incident creation when monitors fail
- [x] Custom headers and request body for HTTP checks
- [x] Per-region status tracking

### Status Pages
- [x] Public status pages with custom slugs
- [x] Custom domain support
- [x] Visual customization (logo, brand color, favicon, CSS)
- [x] Header/footer text customization
- [x] Response time graphs toggle
- [x] Select which monitors appear on each status page
- [x] Custom display names for monitors on status pages

### Incidents
- [x] Manual incident creation and management
- [x] Incident status workflow (investigating → identified → monitoring → resolved)
- [x] Incident severity levels (minor, major, critical)
- [x] Incident update timeline
- [x] Subscribe to incidents via email
- [x] Email verification for subscribers

### Notifications
- [x] Discord webhook notifications
- [x] Email notifications via notification channels
- [x] Configurable event triggers (incident created/resolved/updated, monitor down/recovered)

---

## How to Influence the Roadmap

Have a feature idea? Here's how to get it considered:

1. **Open a discussion** — Describe your use case and why it matters
2. **Upvote existing ideas** — React to issues with 👍 to show demand
3. **Contribute** — PRs welcome for any "Now" or "Next" items

We prioritize based on:
- **User impact** — How many people need this?
- **Strategic fit** — Does it align with Unstatus's core purpose?
- **Effort vs. value** — Quick wins get prioritized
- **Technical readiness** — Some features need infrastructure first

---

*Last updated: April 2026*
