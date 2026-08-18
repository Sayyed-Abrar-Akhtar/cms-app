<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: CMS for cms.sayyedabrarakhtar.com.np

## 1. What this is

A **headless CMS** for a freelance developer who builds portfolio/informational
websites for clients. Two client types: **companies** and **individuals**.
This app is the admin/data layer only — it does **not** render the public
marketing pages. Each client's live site is a separate Next.js deployment
that pulls its content from this CMS's public read API.

There are exactly two roles:

- **SUPERADMIN** (the developer, single account or a couple of trusted ones):
  defines reusable **Component Types** (Banner, Split Image + Text, Project
  Card, etc.) with a fixed set of typed fields, creates client
  **Organizations**, invites their editors, and assigns **Component
  Instances** to an organization's pages.
- **EDITOR** (a client user, belongs to exactly one Organization): can only
  fill in/update the **values** of the components already assigned to their
  org. They cannot create component types, cannot see or touch other orgs'
  data, and — for non-repeatable components — cannot add/remove/reorder
  instances. For components marked `isRepeatable`, they *can* add/remove/
  reorder instances (e.g. "add another project"), but the fields inside each
  instance are still whatever the component type defines.

If a task would let an EDITOR change structure (add a new field, create a
new component type, edit another org's data), stop and flag it — that's a
role-boundary violation, not a feature request.

## 2. Tech stack — locked in, do not substitute

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.3, App Router | Turbopack is default. Read `node_modules/next/dist/docs/` before using any API you're unsure about — see the block above this one. |
| Language | TypeScript, strict mode | No `any`; use `unknown` + narrowing or generics. |
| Database | MongoDB Atlas (free M0 tier) via **Mongoose** | Not Prisma, not the raw driver. Models already exist in `/models`. |
| Auth | **Magic SDK** (`magic-sdk` client, `@magic-sdk/admin` server) | Passwordless email magic link. |
| Sessions | **jose**, custom signed httpOnly cookie | Not next-auth/Auth.js — we roll our own thin session layer on top of Magic. |
| Images | **Cloudinary**, signed uploads only | Never expose an unsigned upload preset. |
| Rich text | **Tiptap**, JSON storage, restricted schema | Never store raw HTML; never allow arbitrary image paste. |
| Styling | Tailwind v4 (CSS-based `@theme` in `app/globals.css`) | No `tailwind.config.js` in this template — see file. |
| Route protection | `proxy.ts` (Next 16's `middleware.ts` replacement) | |
| Deploy target | Vercel | |

## 3. Architecture

```
                     writes (assign components)
  [Superadmin dashboard] ────────────────┐
                                          ▼
  [Editor dashboard] ── writes values ► [MongoDB Atlas]
                                          ▲
                                          │ reads (API-key scoped, read-only)
                                          │
                          [/api/public/[orgSlug]/[page]]
                                          ▲
                                          │ fetched at build/request time
                              [Client A's live Next.js site]
                              [Client B's live Next.js site]
                                        ...
```

This CMS's own `app/` routes are: the login flow, the superadmin dashboard,
the editor dashboard, and the public read API. That's it — no public
marketing rendering here.

## 4. Data modeling strategy

Four Mongoose models (already implemented in `/models` — read them before
writing anything new, don't redefine the schema elsewhere):

- **Organization** — a client account. `type: "COMPANY" | "INDIVIDUAL"`,
  a unique `slug`, and a `publicApiKey` its separate frontend uses to read
  its own content.
- **User** — `role: "SUPERADMIN" | "EDITOR"`, optional `organization` ref
  (null for superadmin), `magicIssuer` set on first login to bind the Magic
  identity to this row.
- **ComponentType** — the blueprint. `fields: FieldDefinition[]` is
  **embedded**, not a separate collection, because fields are never queried
  independently of their component type. `isRepeatable` controls whether
  editors can add/remove instances (see §1).
- **ComponentInstance** — one placement of a ComponentType on one org's
  page. `values: { key, value }[]` is **embedded** too, deliberately, so
  reading "everything on this org's homepage" is a single indexed query
  (`{ organization, page }`) instead of a join across collections. This is
  the idiomatic MongoDB shape (embed what's always read together) — do not
  "normalize" this into a separate FieldValue collection.

When you add anything to the data model, follow this embed-what's-read-
together pattern rather than defaulting to relational-style normalization.

## 5. Field type system

Single source of truth: `lib/field-types.ts` (`FIELD_TYPES` +
`FieldDefinition` type). The nine types: `TEXT`, `RICH_TEXT`, `IMAGE`,
`STRING_URL`, `BOOLEAN`, `NUMBER`, `SELECT`, `LINK`, `DATE`.

- Never hardcode a field-type string anywhere else — import from this file.
- `IMAGE` and any image URL inside `RICH_TEXT`: the hostname **must** be
  `res.cloudinary.com` (mirror this in `next.config.ts`'s
  `images.remotePatterns` too). Validate server-side on every write, not
  just client-side.
- `SELECT` options and other per-type config live in `FieldDefinition.config`
  (a `Mixed` blob) — don't add new top-level schema fields per type.

## 6. Rich text rules

- Tiptap, `StarterKit` trimmed down: bold, italic, links, H2/H3 only (not
  H1 — page titles are structural, not editor-controlled), bullet/ordered
  lists, blockquote. No font-size or color marks — that's how output stays
  on-brand instead of becoming a random assortment of styles.
- Store the Tiptap **JSON** document, not an HTML string.
- Render everywhere through one shared `<RichTextRenderer>` using Tailwind
  Typography tuned to this project's type scale — never `dangerouslySetInnerHTML`
  a raw string.
- Images inside rich text: no paste/drop upload. Add a toolbar "Insert
  image" button that opens the same Cloudinary-signed upload flow used for
  `IMAGE` fields, then inserts a controlled image node. Width/aspect ratio
  stays CSS-driven, not user-set.

## 7. Design system — follow exactly, don't default to a generic admin look

The public site (`sayyedabrarakhtar.com.np`) uses a dark developer-terminal
identity: near-black background, monospace file-tree navigation
(`home.tsx`, `projects/`), numbered config-style sections
(`01skills.config.ts`), command-prompt CTAs (`$ hire-me`). Carry that
identity into this dashboard — it should feel like an IDE/editor, not a
generic SaaS admin panel.

**Color tokens** (add to `app/globals.css` under `@theme inline`):

```css
--color-background: #0a0a0a;
--color-surface: #111114;
--color-surface-hover: #17171b;
--color-border: #26262b;
--color-foreground: #e4e4e7;
--color-muted: #71717a;
--color-accent: #34d399;      /* terminal green — primary actions, "live" status */
--color-accent-dim: #143d2c;  /* accent tint for badges/pills */
--color-warning: #fbbf24;
--color-danger: #f87171;
```

**Type**: `--font-geist-mono` (already wired via `next/font` in
`app/layout.tsx`) for nav, labels, field keys, buttons, breadcrumbs —
anything that's "chrome". `--font-geist-sans` for body copy inside rich
text and long-form form inputs. Don't introduce a third typeface.

**Layout concept**: left sidebar styled like a file tree
(`▤ sites/`, `▣ components/`, `⚙ settings/`). Top bar styled like a
terminal window — a thin strip with three status dots and a breadcrumb
that reads like a file path, e.g. `~/cms/components/banner.json`. A
Component Type's field list renders like a config file: each field a
`key: TYPE` row, monospace key, sans-serif label/help text.

**Signature element**: the Component Type editor *is* a structured config
— lean into that instead of a generic drag-and-drop form builder. This is
earned by the content (these are literally field configs), not decoration.

**Copy/voice** (applies to every button, toast, empty and error state):
- Active voice, name the button by exactly what happens: "Save changes",
  "Publish", "Invite editor" — never "Submit".
- The verb stays consistent through a flow: a "Publish" button produces a
  "Published" toast, not "Success!".
- Empty states are an invitation to act ("No components assigned yet — add
  one from the library"), not just "No data."
- Errors state what happened and how to fix it, in the interface's voice,
  never an apology: "Image must be uploaded through Cloudinary — paste a
  res.cloudinary.com link or use Upload." not "Oops, something went wrong."

## 8. Security rules — non-negotiable

- Authentication is invite-only — no self-registration. New accounts are
  only ever created via the seed script (superadmin) or the Invite Editor
  flow (editors). The magic-link verify endpoint must reject unknown emails.
- Every mutation (Server Action or Route Handler) re-checks `role` and, for
  editors, `organization` **server-side** from the session — never trust a
  client-supplied `organizationId` or `role`.
- An EDITOR's queries/writes are always scoped to their own
  `organization` — filter server-side, don't rely on the UI hiding other
  orgs' data.
- Session cookie: httpOnly, secure, `sameSite: "lax"`, signed with `jose`
  using `SESSION_SECRET`, reasonably short expiry.
- Public API (`/api/public/[orgSlug]/[page]`): requires `x-api-key` header
  matching that org's `publicApiKey`; read-only, never accepts writes;
  only returns data for the org the key belongs to.
- Validate image/URL hostnames server-side on every write, regardless of
  what `next.config.ts` restricts for rendering.

## 9. Conventions

- Server Components by default; add `"use client"` only where interaction
  requires it (forms, the Tiptap editor, the Magic login button).
- Server Actions for authenticated dashboard mutations; Route Handlers for
  the public API and the Magic token verification endpoint.
- One Mongoose model per file in `/models`. One feature area per folder
  under `app/dashboard/`.
- Run `npm run build` before considering a task done — it must pass with
  no type errors.

## 10. Environment variables

See `.env.example` for the full list and where to get each value
(MongoDB Atlas, Magic dashboard, Cloudinary dashboard, Resend dashboard).

- `MONGODB_URI` — MongoDB Atlas connection string.
- `SESSION_SECRET` — Min 32-char secret for JWT session cookie signing.
- `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY` & `MAGIC_SECRET_KEY` — Magic SDK auth credentials.
- `SUPERADMIN_EMAIL` — Initial superadmin email.
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary image upload configuration.
- `RESEND_API_KEY` — Resend API key for sending transactional notification emails.
- `RESEND_FROM_EMAIL` — Sender address (e.g. `RESEND_FROM_EMAIL="CMS <cms@sayyedabrarakhtar.com.np>"`). Note: Domain must be verified in Resend dashboard via DNS records before sending works.

## 11. Current repo state

Already implemented — read before touching:
- `lib/mongodb.ts` — cached Mongoose connection helper.
- `lib/field-types.ts` — `FIELD_TYPES` + `FieldDefinition` type, the single
  source of truth for field kinds.
- `lib/session.ts` — `jose`-based session token sign/verify + cookie
  options (`SESSION_COOKIE_NAME`, `SESSION_COOKIE_OPTIONS`). Task 1 still
  needs to wire this into actual login/logout routes and a `getSession()`/
  `getCurrentUser()` helper — the token layer exists, the auth flow doesn't.
- `models/Organization.ts`, `models/User.ts`, `models/ComponentType.ts`,
  `models/ComponentInstance.ts`.

Not yet implemented — the Magic login flow, `proxy.ts` route protection,
both dashboards, Cloudinary upload handling, the Tiptap editor, and the
public API. See `JULES_BUILD_PLAN.md` for the build order.
