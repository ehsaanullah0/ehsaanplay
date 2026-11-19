# Security Policy — EHSAAN PLAY

EHSAAN PLAY is an independently developed, local-first personal media library and watchlist application. This document explains the security boundaries of the project, known risk areas, and the responsibilities of users and the maintainer.

> **Important:** This is a practical security disclosure, not a guarantee that every possible vulnerability has been identified. No software can be declared completely secure. The project is provided on an as-is and as-available basis, subject to the repository licence and applicable law.

## 1. Scope and security approach

EHSAAN PLAY supports local library usage and optional cloud synchronisation through a Supabase project configured by the user. It also integrates with external services for AI-assisted recommendations and media metadata.

The repository includes:
- Browser-side application code and local browser storage.
- Optional Supabase authentication, database tables, and cross-device sync.
- Gemini-powered recommendation features accessed through application API routes.
- Third-party metadata sources, including TMDB and OMDb.

The security of a user's complete setup depends on the app version, browser/device, external providers, network, and the configuration of any services the user connects.

## 2. Known risks and limitations

The following are important risk areas to understand. They are not a claim that each item is currently exploitable.

### Device and local data
- Local library data and some configuration/cache values are stored in browser storage. Anyone with access to the same unlocked device or browser profile may be able to access or alter that data.
- Clearing browser data, uninstalling/resetting a browser, device failure, or storage corruption may cause loss of local-only information.
- Malware, malicious browser extensions, compromised devices, or an attacker who gains access to an unlocked session may read or change data.
- Do not treat browser storage as encrypted, tamper-proof, or a substitute for backups.

### Cloud sync and Supabase
- Cloud sync is optional and uses a Supabase project configured by the user. A misconfigured project, weak account password, compromised session, exposed secret, or incorrect Row Level Security (RLS) policy can expose or damage data.
- The project-provided SQL setup includes RLS policies intended to restrict personal rows to their authenticated owner. Users must still review the SQL, confirm that RLS is enabled on relevant tables, and verify policies in their own Supabase dashboard.
- The schema verification process checks for expected tables and schema version; a successful verification is not a full security audit of the Supabase project.
- Sync errors, offline queues, concurrent edits, account changes, or incorrect setup may cause delays, conflicts, incomplete synchronisation, or data loss.
- Users control their own Supabase project, database access, backups, retention, billing, and account security.

**Credential warning:** Use only the Supabase publishable/anon key intended for client applications. Never enter, commit, or share a Supabase `service_role` key or any secret key. A publishable key is not a replacement for RLS: database access must be protected by correct policies.

### AI and external API services
- Gemini-generated recommendations may be inaccurate, incomplete, outdated, or misleading. AI output must not be treated as verified fact.
- API availability, quotas, rate limits, billing, terms, and behaviour are controlled by the relevant provider and may change.
- API keys supplied by users must be protected. Do not paste keys into public issues, screenshots, source files, or public repositories. Revoke and replace a key immediately if it may have been exposed.
- TMDB, OMDb, and other external metadata providers may return incorrect, missing, unavailable, or changed information. Their services and content are outside the maintainer's control.
- External services may receive requests and related information as described by their own terms and privacy policies.

### Application and network risks
- Bugs, dependency vulnerabilities, insecure configuration, malicious input, phishing, network interception on unsafe networks, or future code changes may affect confidentiality, integrity, or availability.
- Compatibility issues, browser/device limitations, service outages, and third-party changes may interrupt features.
- No promise is made that the app will be uninterrupted, error-free, compatible with every device, or immune to attack.

## 3. User responsibilities

By using EHSAAN PLAY, users are responsible for:

1. Keeping their device, operating system, browser, and app installation reasonably secure and up to date.
2. Using strong, unique passwords and enabling available account protections for Supabase and other connected services.
3. Keeping API keys, passwords, recovery codes, and session access private.
4. Never entering Supabase service-role or other privileged secret keys into the app.
5. Reviewing their own Supabase RLS policies, database permissions, authentication settings, and project configuration before storing personal data.
6. Maintaining independent backups of important library data and checking that backups can be restored.
7. Reviewing AI-generated recommendations and externally supplied metadata rather than relying on them as authoritative.
8. Understanding the privacy policies, terms, quotas, and possible costs of third-party services they choose to connect.
9. Avoiding the storage or sharing of sensitive personal information that the app does not need.
10. Reporting suspected vulnerabilities responsibly and not testing against systems, accounts, or data they do not own or have permission to assess.

Users are responsible for their own Supabase project and any third-party accounts, API keys, data, configuration, charges, and access permissions associated with them.

## 4. Maintainer responsibilities

The maintainer, **ehsaanullah0**, is responsible for reasonable project-level security practices, including:

- Reviewing and maintaining application code and dependencies with reasonable care.
- Addressing confirmed vulnerabilities in project-controlled code according to severity, impact, and available resources.
- Avoiding intentional publication of private user credentials or secrets in the repository.
- Providing clear setup guidance and documenting known security limitations.
- Reviewing reports submitted through the channels described below and communicating relevant fixes or mitigations when practical.
- Updating or correcting project-provided database setup instructions when a project-level issue is identified.

The maintainer does **not** control or administer each user's device, browser, Supabase project, Google account, API keys, network, or third-party provider accounts. The maintainer cannot guarantee the security, availability, accuracy, or continued operation of external services or user-managed configurations.

This policy does not remove any rights or obligations that cannot legally be excluded under applicable law.

## 5. Google AI Studio and AI-assisted development

Google AI Studio has been used as an AI-assisted development environment and an important starting point for building and iterating on EHSAAN PLAY. It helps developers generate, inspect, and refine application code with Google's Gemini models.

For clarity:

- **Google AI Studio is a development platform, not a security certification.** Its use does not mean Google has independently audited, penetration-tested, approved, or endorsed EHSAAN PLAY.
- AI-generated code can contain mistakes, insecure patterns, missing validation, or incomplete security rules. Generated changes must be reviewed, tested, and maintained by the project developer.
- The maintainer, ehsaanullah0, is responsible for decisions about the code accepted into this repository and the way the application is configured and released.
- Google AI Studio, Gemini, Supabase, TMDB, OMDb, hosting providers, and other integrated services are separate products with their own terms, privacy practices, availability, and security responsibilities.
- The presence of Google AI Studio in the development process does not mean Google operates every part of the released application or is responsible for user-managed services and configurations.

Official documentation:
- [Google AI Studio — Build apps](https://ai.google.dev/gemini-api/docs/aistudio-build-mode)
- [Firebase — Add Firebase to a Google AI Studio app](https://firebase.google.com/docs/ai-assistance/ai-studio-integration)

## 6. Reporting a security vulnerability

Please do not publish exploitable vulnerability details, private data, access tokens, API keys, passwords, or proof-of-concept code that could harm users in a public issue.

If GitHub Private Vulnerability Reporting is enabled for this repository, use the **Report a vulnerability** option in the repository's **Security** tab. If that option is unavailable, contact the maintainer privately through a verified contact channel listed on the maintainer's GitHub profile and ask for a secure reporting method. Do not include secrets in the initial message.

When reporting, include:
- A concise description of the issue and its potential impact.
- The affected app version, commit, file, or component, if known.
- Reproduction steps and a minimal proof of concept that does not access other users' data.
- Any suggested mitigation, if available.

Please allow reasonable time for investigation and a fix before publicly disclosing an unpatched vulnerability. The maintainer will make a reasonable effort to acknowledge and assess reports, but response and remediation timelines are not guaranteed.

## 7. Supported versions

Security fixes are generally prioritised for the latest maintained version and the current default branch. Older releases may not receive fixes. Users should update from the official repository or release channels and review release notes before upgrading.

## 8. Third-party services and licences

EHSAAN PLAY is an independent library/watchlist application, not a streaming service. External metadata, artwork, AI services, hosting, authentication, and database services are subject to their respective providers' terms, policies, licences, and availability. Users must ensure that their use of these services and any content they add complies with applicable law and provider terms.

---

*Last reviewed: 19 November 2026*
