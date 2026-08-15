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

\`\`\`bash
npm install
cp .env.example .env.local   # fill in Mongo/Magic/Cloudinary values
npm run dev
\`\`\`

Requires a free MongoDB Atlas M0 cluster, a Magic (magic.link) app, and a
Cloudinary account — see \`.env.example\` for exactly what's needed from each.

## Status

Foundation only right now: DB connection (\`lib/mongodb.ts\`), the field-type
system (\`lib/field-types.ts\`), and the four Mongoose models (\`/models\`).
Everything else — auth, both dashboards, uploads, the public API — is
scoped out task-by-task in \`JULES_BUILD_PLAN.md\`.
