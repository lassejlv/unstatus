# Privacy Policy

**Effective date:** April 4, 2026

This Privacy Policy explains how Unstatus ("we", "us") collects, uses, and protects your information when you use our service at [unstatus.app](https://unstatus.app).

If you have questions, contact us at **support@unstatus.app**.

---

## 1. Information We Collect

### Account Information

When you sign up via Google OAuth, we receive and store:

- Your name
- Your email address
- Your profile picture (avatar)

We do not store your Google password. Authentication is handled entirely through Google's OAuth flow.

### Organization Data

If you create or join an organization, we store:

- Organization name, slug, and logo
- Your membership role (owner, admin, or member)
- Invitations sent to other users (email, role, status)

### Monitoring Data

When you create monitors, we collect and store:

- Monitor configuration (URL or host, check interval, HTTP method, headers, regions)
- Check results (status, response time, HTTP status codes, response headers)
- Aggregated uptime and performance statistics

### Status Page Data

If you create a public status page, we store:

- Page configuration and branding (name, logo, colors, custom domain)
- Custom CSS and header/footer text you provide
- Links between monitors and status pages

### Subscriber Data

When end-users subscribe to your status page, we store:

- Their email address
- Email verification status
- Which monitors they chose to follow

### Incident and Maintenance Data

- Incident details (title, status, severity, timeline updates)
- Maintenance window schedules and status

### Session and Technical Data

- Session tokens and expiry
- IP address and user agent (browser/OS) at login
- Active organization context

## 2. How We Use Your Information

We use your information to:

- **Operate the Service** -- run monitors, deliver status pages, send notifications
- **Authenticate you** -- manage sessions and organization access
- **Send notifications** -- deliver incident alerts, maintenance updates, and subscriber emails
- **Process payments** -- manage subscriptions through our billing provider
- **Communicate with you** -- respond to support requests and send service-related notices
- **Improve the Service** -- understand usage patterns and fix issues

We do not use your data for advertising. We do not sell your data.

## 3. Third-Party Services

We use the following third-party services to operate Unstatus:

| Service | Purpose | Data shared |
|---------|---------|-------------|
| **Google** | Authentication (OAuth) | Name, email, avatar |
| **Polar** (polar.sh) | Payment processing | Email, billing info |
| **Inbound Email** | Transactional email delivery | Recipient email, email content |
| **Railway** | Infrastructure hosting | All data (stored on their servers) |
| **PostgreSQL** | Database | All stored data |

When you configure **Discord** notification channels, webhook URLs and notification content are sent to Discord's API on your behalf.

Each third-party service operates under its own privacy policy. We encourage you to review them.

## 4. Analytics and Tracking

We do not use client-side analytics, tracking pixels, or third-party advertising trackers. We do not use cookies for tracking purposes.

The only cookies we use are:

- **Session cookie** -- required to keep you logged in
- **UI preference cookies** -- for things like sidebar state

## 5. Data Retention

- **Account data** is retained for as long as your account exists.
- **Monitoring check data** is retained based on your plan (30 days for free plans, longer for paid plans) and then aggregated or deleted.
- **Subscriber data** is retained until the subscriber unsubscribes or you delete your status page.
- **Deleted accounts** -- when you delete your account, we delete your personal data and organization data (where you are the sole owner) within 30 days. Aggregated, anonymized data may be retained.

## 6. Data Security

We take reasonable measures to protect your data:

- All connections use TLS/HTTPS encryption in transit
- Database access is restricted to application services
- OAuth tokens are stored securely and scoped to minimum required permissions
- Custom domain SSL certificates are provisioned automatically

No system is perfectly secure. If you discover a security vulnerability, please report it to **support@unstatus.app**.

## 7. Your Rights

You have the right to:

- **Access** your data through the Unstatus dashboard
- **Correct** your account information at any time
- **Delete** your account and associated data
- **Export** your monitoring and incident data
- **Withdraw consent** by closing your account

If you are in the EU/EEA, you may also have rights under the GDPR including the right to data portability and the right to lodge a complaint with a supervisory authority.

To exercise any of these rights, contact **support@unstatus.app**.

## 8. Children's Privacy

Unstatus is not intended for users under the age of 16. We do not knowingly collect personal information from children. If we learn that we have collected data from a child under 16, we will delete it promptly.

## 9. International Data Transfers

Your data may be processed and stored in regions outside your country of residence, including the European Union and the United States, depending on our infrastructure provider's data center locations.

## 10. Status Page Subscribers

If you subscribe to a status page operated by an Unstatus user, that user's organization controls the status page and decides what notifications to send. Your email address is stored by Unstatus on behalf of that organization. You can unsubscribe at any time via the link in any notification email.

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes will be communicated via email or a notice in the Service. The "Effective date" at the top will be updated accordingly.

## 12. Contact

For privacy-related questions or requests:

**Email:** support@unstatus.app
**Website:** [unstatus.app](https://unstatus.app)
