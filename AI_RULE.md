# AI_RULE.md — Non-Negotiable Project Rules

> These rules apply to **every** change made by any agent (or human) in this repository. Where this file conflicts with any other doc, this file wins unless `context.md` says otherwise.

---

## 1. Pre-Implementation Protocol

Before ANY code, content, schema, or file change:

1. Read `AGENTS.md`, `context.md`, `AI_RULE.md`, and `gemini.md`.
2. Load the relevant opencode skill from `agents/skills/` (if any) and follow its workflow.
3. Understand the existing pattern (module structure: routes/controller/service/repository/schema) and mimic it.
4. Only then make the change.

Do not skip these steps "because the change is small." Small changes still follow conventions.

---

## 2. Database Changes MUST Use Migrations (STRICT)

The database schema is managed solely through **Prisma Migrations**. This is non-negotiable.

### Rules
- **`prisma db push` is PROHIBITED** for any schema change in this project. It is not part of the sanctioned workflow and must never be run.
- Every schema change goes through a real migration:
  - After editing `prisma/schema.prisma`, run:
    - `npx prisma migrate dev --name <short_snake_case_description>` (local)
    - `npx prisma migrate deploy` (production/staging)
  - A migration folder under `prisma/migrations/` MUST be committed alongside the schema change.
- Never hand-edit an already-applied migration. Create a new one instead.
- Regenerate the client after any schema change: `npm run prisma:generate`.
- Never change the schema without also committing the matching migration — a schema diff with no migration will be rejected in review.
- Plasticity of the migration workflow: always inspect the generated SQL before applying and confirm it matches intent.

---

## 3. Integrity Rule

Never invent or state unverified:
- years of experience, certifications, brands serviced,
- warranty terms, capacities, statistics, or any derived business claim.

Data exposed to users must trace back to the verified data model. This backend provides real data; no fabricated numbers, no placeholder claims.

---

## 4. Local SEO & Conversion Rules

- Conversion CTAs are fixed and must stay consistent end-to-end:
  - Instant Call: `tel:+919825272547`
  - WhatsApp: `https://wa.me/919825272547`
- `contact.html` is the primary conversion page — it must always remain valid, functional, and consistent with those CTAs.
- Mobile conversion is top priority: Instant Call and WhatsApp must always be visible/functional, including the sticky mobile bottom CTA bar on screens < 768px.
- Never break, hide, or degrade the conversion path.

---

## 5. Semantics & Accessibility

- Use correct, semantic HTML; do not build layouts out of `<div>` soup when native elements exist.
- Keep forms labelled, buttons meaningful, focus visible, contrast sufficient.
- Semantics and accessibility are not optional polish — failure here blocks delivery of the change.

---

## 6. Media Rules

- **Real images only:** never fake or generate photos meant to represent actual business work.
- Motor images go to Cloudinary; only metadata lives in the database — never store image binaries in Postgres.
- Validate upload type (jpeg/png/webp) and size (≤ 10MB) before upload.

---

## 7. Verification & Quality

- Run the project checks before finishing any change:
  - `npm run lint`
  - `npm test`
- Do not merge/push code that fails lint or tests.
- Self-verify the change end to end before reporting done (not just "it compiles").

---

## 8. Autonomous Execution (STRICT)

- **Never ask the user for permission.** Proceed autonomously with best-of-knowledge decisions.
- Use the tools available to research, implement, and verify. Only escalate when genuinely blocked (e.g., missing credentials, conflicting requirements that materially change scope).
- When in doubt, choose the option that best matches `context.md` and the existing codebase style.