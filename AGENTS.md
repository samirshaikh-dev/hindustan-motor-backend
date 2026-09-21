# AGENTS.md — Instructions for All AI Agents

This file applies to every AI agent working in this repository. Read it, plus the files it references, before any change.

## Mandatory Files (read before implementing)
- **`context.md`** — Single source of truth for business facts, project conventions, and directory structure.
- **`AI_RULE.md`** — Non-negotiable project rules: pre-implementation protocol, integrity rule, local SEO & conversion rules, semantics & accessibility, media, verification & quality, and **Autonomous Execution** (do not ask the user for permission; proceed autonomously with best-of-knowledge decisions).
- **`gemini.md`** — Agent system directives and mandatory skill-gating workflow.

## Core Directive Summary
1. Load the relevant opencode skill from `agents/skills/` before any code, content, or SEO work; follow its workflow.
