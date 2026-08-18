# CMS — cms.sayyedabrarakhtar.com.np

Headless CMS for managing portfolio/informational site content for company
and individual clients. Superadmin defines reusable component types;
clients' editors fill in the content; each client's public-facing site
reads its content back out through a per-org API key.

## Full spec

- **`AGENTS.md`** — the complete project spec: tech stack, architecture,
  data model, field type system, design system, security rules, coding
  conventions. Read this first, human or agent.
- **`JULES_BUILD_PLAN.md`** — the build broken into sequenced, ready-to-paste
  prompts for Google Jules (or to work through manually/with another agent).

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Mongo/Magic/Cloudinary values
npm run dev
```

Requires a free MongoDB Atlas M0 cluster, a Magic (magic.link) app, and a
Cloudinary account — see `.env.example` for exactly what's needed from each.

## Testing auth

To verify the authentication flow and access controls end-to-end:

### Required environment variables
Ensure the following variables are present in your `.env.local`:
- `MONGODB_URI`: Valid MongoDB connection string.
- `SESSION_SECRET`: Random string (at least 32 characters) for signing JWT cookies.
- `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY`: Publishable key from your Magic dashboard.
- `MAGIC_SECRET_KEY`: Secret key from your Magic dashboard.
- `SUPERADMIN_EMAIL`: Email address to seed/promote as `SUPERADMIN`.

### Verification Steps

1. **Seed Superadmin User:**
   Run the seeding script to create or promote your user to `SUPERADMIN`:
   ```bash
   npm run seed
   ```
   Confirm output indicates either `Created new superadmin user: <email>` or `Promoted existing user to superadmin: <email>`.

2. **Data Migration (User Organizations):**
   To convert legacy `User` documents from a singular `organization` field to the many-to-many `organizations` array format:
   ```bash
   npm run migrate
   ```
   Confirm output indicates `Migration complete. Processed X user(s).`.

3. **Login Loop Verification:**
   - Navigate to `/login`.
   - Enter your email address (matching `SUPERADMIN_EMAIL`).
   - Check your inbox for the Magic Link email and click the link.
   - You should land authenticated on `/dashboard` with `ROLE: SUPERADMIN`.
   - If an email cannot be received (e.g. invalid keys or environment restrictions), `/login` will display a standard authentication error from Magic SDK.

4. **Role & Route Access Verification:**
   - **Logged Out:** Directly visiting `/dashboard`, `/dashboard/components`, or `/dashboard/organizations` redirects to `/login`.
   - **SUPERADMIN:** In `/dashboard`, links to `▣ Component Types` (`/dashboard/components`) and `▤ Organizations` (`/dashboard/organizations`) are displayed and accessible.
   - **EDITOR:** Logging in with an email not marked as superadmin will assign `role: EDITOR`. Direct navigation to `/dashboard/components` or `/dashboard/organizations` will be intercepted by `proxy.ts` and redirect back to `/dashboard` with an error message (`Access restricted: Superadmin permission required for this section.`).

## Status

Task 1 completed: Session & auth foundation, superadmin seeding script (`scripts/seed-superadmin.ts`), Magic login flow (`/login` and `/api/auth/verify`), and route proxy protection (`proxy.ts`).
