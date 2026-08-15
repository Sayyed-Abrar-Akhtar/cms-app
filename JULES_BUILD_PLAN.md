# Jules build plan

Jules works best on small, focused, verifiable tasks — not one giant
"build the whole app" prompt. `AGENTS.md` (repo root) is read automatically
before every task and holds the persistent spec (tech stack, data model,
design system, security rules). Don't repeat that context here; these
prompts only say what's different task-to-task.

**Workflow:** push this repo to GitHub → connect it in Jules → paste Task 1
below as a new task → review Jules's plan before approving → review the PR
diff → merge → paste Task 2 → repeat. Each task assumes the previous one is
merged.

---

## Task 1 — Session & auth foundation

```
Read AGENTS.md first.

Build the login system:

1. lib/session.ts already exists (createSessionToken, verifySessionToken,
   SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS) — review it against
   AGENTS.md §8 and reuse it rather than rebuilding; only touch it if you
   find a real gap.
2. lib/auth.ts — getCurrentUser() (reads the cookie, loads the User from
   Mongo), requireSuperadmin(), requireEditor() helpers for use in Server
   Actions and Route Handlers. Each should redirect to /login if unauthenticated,
   or throw/return a 403 if the role doesn't match.
3. app/login/page.tsx — client component. Email input, calls Magic's
   loginWithMagicLink client-side, then POSTs the resulting DID token to
   /api/auth/verify.
4. app/api/auth/verify/route.ts — verify the DID token with @magic-sdk/admin,
   find-or-create the User by email (default role EDITOR, no organization —
   superadmin promotion is manual via SUPERADMIN_EMAIL/seed script, build
   that script too: scripts/seed-superadmin.ts, runnable with `npm run seed`),
   set magicIssuer if not already set, create the session, redirect to
   /dashboard.
5. app/api/auth/logout/route.ts — destroy the session, redirect to /login.
6. proxy.ts — protect /dashboard/** (any authenticated user) and
   /dashboard/components/** + /dashboard/organizations/** (SUPERADMIN only).
   Unauthenticated → /login. Wrong role → redirect to /dashboard with an
   error message, don't just 403 blank.

Style the login page per AGENTS.md §7 (dark, monospace chrome, terminal
window framing) — this is the first thing any user sees.

Acceptance criteria:
- Visiting /dashboard while logged out redirects to /login.
- A superadmin (seeded via the script) can log in and reach /dashboard.
- An editor without an organization can log in but sees a clear "not yet
  assigned to an organization — contact your admin" state, not a crash.
- npm run build passes with no type errors.
```

---

## Task 2 — Superadmin: Component Type builder

```
Read AGENTS.md first. Task 1 (auth) must already be merged.

Build app/dashboard/components/ (SUPERADMIN only):

1. app/dashboard/components/page.tsx — list all ComponentTypes as
   config-file-styled cards (name, slug, field count, repeatable badge).
   Empty state per AGENTS.md §7 voice rules.
2. app/dashboard/components/new/page.tsx + a client form — create a
   ComponentType: name, slug (auto-suggest from name, editable), description,
   isRepeatable toggle, and a repeatable field-row builder (key, label, type
   dropdown from FIELD_TYPES, required toggle, order, and type-specific
   config — e.g. options list for SELECT, maxLength for TEXT, allowedDomains
   pre-filled + locked to res.cloudinary.com for IMAGE).
3. app/dashboard/components/[slug]/page.tsx — edit an existing ComponentType
   (same field builder, pre-filled). Editing fields on a type that already
   has instances is allowed but show a warning: existing instance values for
   removed fields will be orphaned (don't silently delete instance data).
4. Server Actions for create/update, using requireSuperadmin(). Validate
   with zod: unique slug, unique field keys within a type, at least one field.

Acceptance criteria:
- A superadmin can create "Banner" with fields headline (TEXT, required),
  subheadline (TEXT), backgroundImage (IMAGE), ctaLabel (TEXT), ctaHref
  (STRING_URL) and see it in the list.
- Duplicate slugs or duplicate field keys are rejected with a specific error
  message (not a generic "invalid").
- An EDITOR account hitting /dashboard/components directly is redirected,
  not shown a broken page.
```

---

## Task 3 — Superadmin: Organizations & editor invites

```
Read AGENTS.md first. Tasks 1–2 must already be merged.

Build app/dashboard/organizations/ (SUPERADMIN only):

1. List + create Organization (name, slug, type: COMPANY | INDIVIDUAL,
   ownerEmail). publicApiKey is generated automatically (model default) —
   show it once with a copy button and a note that it's how the client's
   own site will read their content.
2. Invite an editor: given an email, create/find the User, set
   role=EDITOR and organization=<this org> if they're not already attached
   elsewhere (if they are, show an explicit conflict error — don't silently
   reassign someone's org).
3. Organization detail page: list attached editors, show the API key
   (with regenerate action — regenerating invalidates the old key
   immediately).

Acceptance criteria:
- Creating an org and inviting an editor by email works end-to-end; that
  editor can then log in (Task 1 flow) and lands in their org's dashboard.
- Regenerating an API key immediately invalidates the old one (verify this
  once Task 7's public API exists — leave a TODO comment referencing that).
```

---

## Task 4 — Superadmin: assign components to an org's page

```
Read AGENTS.md first. Tasks 1–3 must already be merged.

From an Organization's detail page, let the superadmin build out a page
(e.g. "home") by assigning ComponentInstances:

1. "Add component" — pick a ComponentType from the library, choose a page
   (existing or new string), it's appended with the next order value.
2. Reorderable list of instances already on a page (drag or up/down
   controls — keep it simple, up/down buttons are fine).
3. Remove an instance (confirm first — this deletes its values too, say so
   in the confirmation).
4. Values start empty; editors fill them in via Task 5's UI, not here.

Acceptance criteria:
- Superadmin can build "home" for a COMPANY org out of Banner + Split
  Image + Text + Project Card (repeatable), in a chosen order.
- Reordering persists (order field updates, list reflects it on reload).
```

---

## Task 5 — Editor dashboard: dynamic field editor, Cloudinary, Tiptap

```
Read AGENTS.md first. Tasks 1–4 must already be merged. This is the biggest
task — take it slow, and it's fine to open the PR once the core field types
work even if you leave a few edge cases as follow-up TODOs (call them out
explicitly in the PR description).

1. app/dashboard/page.tsx for EDITOR role — list pages that have instances
   assigned to their org.
2. app/dashboard/[page]/page.tsx — render every ComponentInstance on that
   page as a form generated from its ComponentType's fields, in one
   auto-generated component per FieldType under
   app/dashboard/_fields/ (TextField, RichTextField, ImageField,
   UrlField, BooleanField, NumberField, SelectField, LinkField, DateField).
3. lib/cloudinary.ts — server-side signature endpoint
   (app/api/cloudinary/sign/route.ts, requireEditor or requireSuperadmin)
   so uploads go client → Cloudinary directly using a short-lived signature,
   never exposing CLOUDINARY_API_SECRET to the browser.
4. ImageField — upload via that signed flow, preview, and also accept a
   direct res.cloudinary.com URL paste (validate hostname before accepting).
5. RichTextField — Tiptap per AGENTS.md §6's restricted schema, with the
   "Insert image" toolbar button wired to the same signed Cloudinary flow.
6. Save via a Server Action scoped to the editor's own organization
   (requireEditor + verify the instance.organization matches the session —
   see AGENTS.md §8, this check is not optional).
7. Autosave-on-blur or an explicit "Save changes" button — pick one, be
   consistent, and show a "Saved" confirmation per the voice rules.

Acceptance criteria:
- An editor can fill in and save every field type on a Banner instance,
  reload, and see the values persisted.
- Uploading an image goes through Cloudinary and the stored value is a
  res.cloudinary.com URL.
- An editor cannot save values onto an instance belonging to a different
  organization, even by guessing/crafting a request (verify server-side,
  not just hidden in the UI).
```

---

## Task 6 — Repeatable components (add/remove/reorder instances)

```
Read AGENTS.md first. Task 5 must already be merged.

For ComponentTypes with isRepeatable: true (Project, Experience, Completed
Work, etc.), let the EDITOR — not just the superadmin — add, remove, and
reorder instances of that type on their own org's page, using the same
field editor from Task 5 for each instance's values.

1. "Add another [Project/Experience/...]" button on any repeatable
   component's section, scoped to the editor's org.
2. Remove with confirmation (per AGENTS.md §7 voice rules).
3. Reorder (reuse the up/down pattern from Task 4).
4. Non-repeatable components must NOT show add/remove controls to editors —
   only superadmin can change their count (via Task 4's UI).

Acceptance criteria:
- An editor can add a third "Project" entry, fill it in, and it appears
  correctly ordered without superadmin involvement.
- An editor cannot add a second "Banner" (non-repeatable) — the control
  simply isn't there.
```

---

## Task 7 — Public read API

```
Read AGENTS.md first. Tasks 1–6 must already be merged.

app/api/public/[orgSlug]/[page]/route.ts:

1. Require header x-api-key, look up the Organization by orgSlug, 401 if
   missing/mismatched key, 404 if org or page doesn't exist.
2. Return each ComponentInstance on that page, in order, with its
   ComponentType's slug/fields resolved so the consuming frontend knows how
   to render each block, and the actual values.
3. Read-only — reject any method other than GET.
4. Wrap the DB read in Next 16's "use cache" with a short revalidate
   window (e.g. 60s) so a client's site isn't hammering Mongo on every
   visitor — see the Next docs in node_modules per the top of AGENTS.md
   for the current Cache Components API before implementing this.
5. Add a short doc comment at the top of the file showing an example fetch
   call a client site would make, since that's effectively this API's
   public contract.

Acceptance criteria:
- A valid key + existing org/page returns the expected JSON shape.
- An invalid key returns 401 with no data leaked.
- Regenerating an org's key (Task 3) immediately invalidates the old one.
```

---

## Task 8 — Design system pass

```
Read AGENTS.md §7 first. All previous tasks should be merged — this task
is about consistency, not new features.

Audit every screen built so far against AGENTS.md §7 (tokens, type,
layout concept, voice) and fix drift: components that snuck in default
Tailwind grays instead of the defined tokens, buttons that say "Submit",
missing empty states, missing loading states (use Suspense boundaries with
skeletons that match the terminal aesthetic, not generic spinners), missing
error boundaries with voice-appropriate copy. Check keyboard focus is
visible everywhere and the dashboard is usable down to a narrow mobile
width. Respect prefers-reduced-motion for any transitions added.

Acceptance criteria:
- No raw Tailwind gray-* colors outside the defined CSS variables.
- Every button/toast pair uses matching verbs (Task-by-task audit,
  list what you changed in the PR description).
- Lighthouse accessibility score noted in the PR description (run it, don't
  just assert compliance).
```

---

## Task 9 — Tests & deploy readiness

```
Read AGENTS.md first.

1. Add scripts/seed-superadmin.ts (referenced in Task 1) if not already
   done, reading SUPERADMIN_EMAIL.
2. Basic test coverage (pick a runner — Vitest is a reasonable default for
   a Next.js/TS project; note the choice in the PR) for: the FieldValue
   validation logic, the image-domain allowlist check, and the public API's
   auth check (valid/invalid key, wrong org).
3. Write a DEPLOYMENT.md: Vercel env vars checklist (from .env.example),
   MongoDB Atlas network access note (allow 0.0.0.0/0 or Vercel's IPs),
   Cloudinary upload preset/folder setup, and the DNS step for pointing
   cms.sayyedabrarakhtar.com.np at the Vercel project.

Acceptance criteria:
- npm test passes.
- DEPLOYMENT.md is enough for someone who's never touched this repo to get
  it live.
```
