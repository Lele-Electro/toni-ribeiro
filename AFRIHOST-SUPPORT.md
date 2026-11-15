Subject: Cloudflare Worker SMTP connections time out for bookings@toniribeiro.co.za

Hello Afrihost Hosting Support,

Please investigate remote authenticated SMTP access for this hosting account:

- Domain: toniribeiro.co.za
- Mailbox: bookings@toniribeiro.co.za
- Hosting server: anissa.aserv.co.za
- Mail server: mail.toniribeiro.co.za, resolving to 197.242.159.144
- Application: https://digiterra-backend.toni101ribeiro.workers.dev
- Application purpose: transactional welcome, password-recovery and booking-confirmation emails

SMTP authentication succeeds from our South African development machine using both implicit TLS on port 465 and STARTTLS on port 587. Authentication also succeeds locally using anissa.aserv.co.za as the SMTP hostname. The mailbox is active, has available storage, and outgoing sending is allowed in cPanel.

The hosting account's cPanel IP Blocker reports "No IPs are being blocked." We did not change the mailbox password, security rules or account restrictions. This account-level web blocklist does not expose server-wide SMTP firewall or country rules.

From the deployed Cloudflare Worker, both ports time out before SMTP authentication. Nodemailer reports ETIMEDOUT with command CONN. A direct native Cloudflare socket probe on port 587 also timed out, so the problem is reproducible independently of Nodemailer. Public and local DNS resolve the same mail-server IP. The application's MongoDB connection and booking API work normally.

One recent failed production connection was recorded on 3 November 2026 at 17:20:14 UTC (19:20:14 SAST). Earlier checks during the same afternoon showed the same failure.

Please check server/upstream firewall rules, country restrictions, cPHulk or other IP bans affecting connections from Cloudflare Workers to this server. Please confirm the supported configuration for authenticated transactional SMTP from Cloudflare and advise any required source-IP or country allowlisting. If the shared-hosting plan restricts this use, please advise the supported SMTP relay option and its requirements.

The account owner requests whitelisting of all Cloudflare traffic required for this application's authenticated SMTP connections to this mailbox on ports 465 and 587, including any required country or cloud-network allowlisting.

Please preserve SMTP authentication and TLS requirements. We are not requesting an unauthenticated/open relay or a password change.

Thank you.

---
Prepared locally for review. Not submitted. No passwords, API keys, or cPanel session links are included.
