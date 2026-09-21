# AI_RULE.md — Non-Negotiable Project Rules

This file applies to every AI agent working in this repository and its associated projects (the Hindustan Electricals marketing site and the Motor Workshop Management Backend). Rules are non-negotiable. When a rule conflicts with another doc, **this file wins**, except `context.md` for business facts and conventions.

None of these rules are negotiable — no one can override them, not even the developer (unless the developer explicitly changes this file, and the change makes sense).

---

## 1. Pre-Implementation Protocol

Before ANY code, content, or file change:

1. Read and internalize, in order:
   - `AGENTS.md`
   - `context.md` (single source of truth)
   - `AI_RULE.md` (this file)
   - `gemini.md` (system directives + skill-gating workflow)
2. Load the relevant opencode skill from `agents/skills/` for the work being done (ui-ux, frontend, seo, keyword-research, performance, or backend-specific skills when they exist).
3. Follow that skill's workflow end-to-end, including its self-verification steps.
4. If the task touches multiple domains, load each relevant skill.
5. Only after the protocol is satisfied may implementation begin.

There is no exception. "I didn't know" is not accepted — the mandatory files exist precisely to prevent unknown-work.

---

## 2. Integrity Rule

Never invent, imply, or state unverified facts. This applies to everything the project ships:

- Years of experience
- Certifications and accreditations
- Brands serviced / repaired
- Warranty terms
- Capacities, tolerances, HP/KW ratings, RPM claims
- Statistics, counts, testimonials, or case figures
- Any promise about a repair outcome, turnaround, or price

Rules:

- Only claims that are **true and verifiable for the real business** may appear anywhere (site, API, data model, docs).
- This backend provides the data model; any claim later exposed to users must be traceable to verified data, never invented client-side or AI-side.
- Default posture is **understate**, never overstate. When in doubt about a fact, omit it or mark it as unverified — do not embellish.
- Ask the owner for the real facts when a claim is needed and unverified; do not guess.

---

## 3. Local SEO & Conversion Rules

The purpose of the marketing presence is conversion: turning a local search/visitor into a phone call or a WhatsApp message.

- Instant Call: `tel:+919825272547` — must work, always.
- WhatsApp: `https://wa.me/919825272547` — must work, always.
- `contact.html` is the primary conversion page:
  - It must remain valid, functional, and consistent with both CTAs above.
  - Any edit to it is high-priority; self-verify after the edit.
- Mobile conversion is the top priority:
  - On screens < 768px, Instant Call and WhatsApp must always be visible/functional.
  - The sticky mobile bottom CTA bar (Call + WhatsApp) must not be removed, hidden, or broken.
- Keep NAP (Name, Address, Phone) and CTA strings consistent across every page and every API-facing payload.
- Never rephrase, truncate, or "clean up" the phone number or WhatsApp link.
- Local SEO content (snippets, schema, headings, meta) must be truthful (see Integrity Rule) and match the real contact information.

---

## 4. Semantics & Accessibility

- Use semantic HTML (`<main>`, `<section>`, `<h1>–<h3>`, `<nav>`, `<address>`, etc.). No div-soup where a semantic element exists.
- One `<h1>` per page; heading hierarchy must be logical and never skip levels.
- Every image needs a meaningful `alt`; decorative images use `alt=""` (or equivalent).
- Forms: real `<label>` elements wired to inputs; visible focus states; keyboard operable.
- Color is never the sole carrier of meaning; contrast meets WCAG AA (4.5:1 body text).
- Targets must be reachable by keyboard and announced correctly to screen readers.
- Never disable zoom, or trap focus, or use unlabeled icon-only buttons.
- Accessibility defects are bugs — fix, don't bypass.

---

## 5. Media

- **Real images only.** Never fake, generate, or borrow photos meant to represent the actual business's work.
- Do not produce AI-generated photos/illustrations that claim to be workshop results.
- For this backend:
  - Image binaries are **never stored in PostgreSQL**. Only metadata lives in the DB (`MotorImage`: publicId, secureUrl, resourceType, width, height, bytes, format).
  - Actual files are uploaded to **Cloudinary** and referenced by `secureUrl`.
- Compress/optimize images for the web; prefer jpeg/png/webp; use lazy loading where appropriate.
- Caption or label images accurately; never misrepresent what a photo shows.

---

## 6. Verification & Quality

Before declaring a task complete, an agent must self-verify:

- Run the project's checks: `npm test`, `npm run lint`, `npm run format` (backend). Run the site's equivalent checks for the marketing project.
- Re-read the edited files in full to catch broken markup, truncated links, or stale content.
- Verify the contact/CTA facts survived the edit (phone, WhatsApp, contact page intact).
- Verify no unverified claim was introduced (Integrity Rule).
- Verify the effect is real: if a page, route, or screen changed, confirm the change renders/work/responds as intended.
- Confirm the response envelope and error codes match the documented API contract (backend) before finishing.
- If verification tools are unavailable, say so explicitly instead of claiming success.

Quality bar: the work must be shippable, consistent with the codebase conventions, and honest.

---

## 7. Autonomous Execution

> Never ask the user for permission. Proceed autonomously with best-of-knowledge decisions.

- Do not pause implementation to ask "should I…" for in-scope work. Make the best judgment call and proceed.
- Complete the full task end-to-end: implement, verify, and report.
- Where a decision is ambiguous, choose the option that best matches `context.md` and the repo's existing patterns, and note the decision in your final summary.
- Escalate only when a decision requires a real-world business fact that only the owner can supply (e.g., an unverified certification) — and even then, also proceed with a safe fallback (omit the claim) rather than blocking.
- When a task references `contact.html` or the CTA facts, treat quality as non-negotiable and self-verify even if it means extra checks.
- Respect the scope cap: never silently add features outside the requested scope (see `context.md` "Out of scope"); if a useful addition exists, note it instead of building it.

This section exists so agents never stall. If you are unsure between two correct-enough options, pick one, proceed, and document why.

---

## 8. Do / Don't Summary

| Do | Don't |
|---|---|
| Read mandatory docs before work | Skip the pre-implementation protocol |
| Load the matching skill from `agents/skills/` | Write code/content without a skill workflow |
| Keep CTAs and contact facts exact | Rephrase or "fix" the phone/WhatsApp links |
| Use real, verified business facts | Invent experience, brands, certifications, stats |
| Use real workshop images | Use fake/generated photos of the business' work |
| Semantic, accessible markup | Div-soup, skipped headings, icon-only unlabeled buttons |
| Run tests/lint and self-verify | Report success without running checks |
| Proceed autonomously | Stop and ask permission for in-scope work |
| Stay in requested scope | Silently add out-of-scope features |