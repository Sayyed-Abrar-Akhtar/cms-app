# Production Deployment Guide — Headless CMS (`cms.sayyedabrarakhtar.com.np`)

This guide outlines step-by-step procedures to deploy, configure, and maintain the Headless CMS in production on Vercel with MongoDB Atlas, Magic SDK, Cloudinary, and Resend.

---

## 1. Environment Variables Configuration

Set up the following environment variables in your local `.env` and Vercel Project Settings (**Settings → Environment Variables**):

| Variable Name | Required | Description / Example |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/cms?retryWrites=true&w=majority`) |
| `SESSION_SECRET` | Yes | Secret key (min 32 characters) used by `jose` to sign session cookies |
| `SUPERADMIN_EMAIL` | Yes | Primary email address for the superadmin account (e.g., `abrar@example.com`) |
| `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY` | Yes | Magic SDK publishable key from Magic Dashboard |
| `MAGIC_SECRET_KEY` | Yes | Magic SDK secret key from Magic Dashboard |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API Secret |
| `RESEND_API_KEY` | Yes | Resend API Key for sending invite emails |
| `RESEND_FROM_EMAIL` | Yes | Verified sender email address (e.g., `CMS <cms@sayyedabrarakhtar.com.np>`) |

---

## 2. External Service Setup

### A. MongoDB Atlas
1. Ensure your MongoDB Atlas cluster allows connections from Vercel (`0.0.0.0/0` in Network Access, or configured Vercel IP ranges).
2. Obtain your production MONGODB_URI connection string.

### B. Resend Email Domain Verification
1. Log in to [Resend Dashboard](https://resend.com/domains).
2. Add your sending domain (e.g., `sayyedabrarakhtar.com.np`).
3. Add the provided **MX**, **TXT (SPF)**, and **DKIM** records into your DNS provider.
4. Confirm domain verification status in Resend before sending invitation emails.

### C. Cloudinary Upload Configuration
1. Ensure your Cloudinary cloud name, API key, and API secret are configured.
2. Signed uploads are enforced — media URLs will be hosted under `res.cloudinary.com`.

---

## 3. Database Initialization & Operations Scripts

Before or immediately after deploying to production, run the database initialization scripts against your production database:

### A. Seed Superadmin Account
Runs idempotently to ensure the user specified by `SUPERADMIN_EMAIL` exists in MongoDB with `role: "SUPERADMIN"`.

```bash
MONGODB_URI="<your-production-mongodb-uri>" SUPERADMIN_EMAIL="<your-email>" npm run seed
```

*Note: If an existing user had role `EDITOR`, running this script will update their role to `SUPERADMIN`.*

### B. Migrate Legacy User Organizations
Migrates legacy single-organization users (`organization: ObjectId`) to the multi-organization structure (`organizations: [ObjectId]`).

```bash
MONGODB_URI="<your-production-mongodb-uri>" npm run migrate
```

---

## 4. Vercel Production Deployment

1. **Git Branch Setup**: Ensure `main` is configured as the production branch in Vercel.
2. **Deploy**:
   - Push to `main` branch to trigger an automatic Vercel build and deploy.
   - Or deploy manually via Vercel CLI: `vercel --prod`.
3. **Verify Deployment Freshness**:
   - Verify build logs in Vercel Dashboard to confirm the commit hash matches `main`.

---

## 5. Post-Deployment Verification Checklist

- [ ] Log in as Superadmin at `/login` via Magic magic link.
- [ ] Confirm access to `/dashboard` (Superadmin dashboard).
- [ ] Test editor invitation for an organization and verify Resend email delivery.
- [ ] Test client site public API access:
  ```bash
  curl -X GET "https://cms.sayyedabrarakhtar.com.np/api/public/<org-slug>/<page>" \
       -H "x-api-key: <org-public-api-key>"
  ```
