# AGENTS.md

## Purpose

This file provides reusable, agent-friendly instructions for **Adobe Commerce Edge Delivery Services (EDS)** storefront projects. It is written to work well with **Codex** and should remain useful for other coding agents that support `AGENTS.md`.

Use this file as the starting template for projects that include:

- A GitHub code repository for storefront implementation
- A `da.live` content repository for authoring and content operations
- Adobe Commerce storefront development on Edge Delivery Services

Replace placeholder values such as `[PROJECT_NAME]`, `[BRAND_NAME]`, and reference URLs before using this in a new project.

## Project Overview

- Project name: Seagate
- Brand: Seagate
- Adobe Commerce offering: PaaS Commerce backend, EDS Storefront Frontend
- Code repository: TBD
- Content repository: TBD
- Local preview: TBD
- Preview: TBD
- Live: TBD

## Scope

This ruleset applies only to **Adobe Commerce storefront work on Edge Delivery Services**.

In scope:

- EDS storefront blocks
- Commerce block customization
- Drop-in customization
- Frontend JavaScript and CSS
- Content modeling for authors
- `da.live` authoring and content pipeline workflows
- Commerce API consumption from the storefront
- Performance, accessibility, and responsive behavior

Out of scope:

- Backend integration middleware
- ERP, CRM, PIM, or OMS synchronization
- App Builder backend extensions
- Payment, shipping, or tax webhooks
- Admin UI SDK extensions

If a request is primarily about backend integrations, webhooks, or non-storefront extensibility, stop and redirect to the appropriate starter kit or backend workflow.

## Agent Expectations

- Prefer agent-agnostic instructions over tool-specific instructions.
- When agent-specific behavior is needed, optimize first for Codex, then adapt as needed for the active agent.
- Treat this file as the closest source of working instructions for the repository.
- Follow explicit user instructions over this file when they conflict.
- Be precise, implementation-oriented, and safe.
- Preserve maintainability and upgrade compatibility with Adobe Commerce storefront patterns.

## New Task Protocol

For every new task:

1. Validate that the request is in storefront scope.
2. Load `project-manager` first for scoping and workflow control.
3. Assess task complexity before implementation.
4. Use `researcher` before making assumptions about Commerce APIs, drop-ins, slots, events, or EDS patterns.
5. Check for existing blocks, utilities, or patterns before creating new ones.
6. Test changes in a browser when UI behavior or presentation is affected.

### Complexity Guidance

Treat a task as simple when it is a small, well-defined change with minimal ambiguity. For simple tasks, the agent may proceed directly after quick scoping. Treat a task as complex when it spans multiple files, requires architecture decisions, touches Commerce APIs or multiple drop-ins, or needs content-model decisions. For complex tasks, use a phased workflow with clear requirements, approach, implementation, and validation steps.

## Primary Skills

These are the primary skills for this project and should be used first when relevant:

- `project-manager`
- `researcher`
- `tester`
- `dropin-developer`
- `content-modeler`
- `block-developer`
- `da-content-pipeline` ("Da Content Pipeline")

### Primary Skill Routing

- Use `project-manager` at the start of every new task.
- Use `researcher` before implementation decisions, especially for Commerce docs, APIs, slots, events, props, and existing code patterns.
- Use `tester` for browser-based verification, responsive QA, and interaction checks.
- Use `dropin-developer` for Commerce drop-in customization, slot work, container usage, and event integration.
- Use `content-modeler` for author-friendly block structures and content planning.
- Use `block-developer` for block creation, decoration, DOM work, and CSS/JS customization.
- Use `da-content-pipeline` whenever content needs to be prepared for or pasted into `da.live`, converted to DA format, or uploaded through the DA pipeline.

## Secondary Skills

If the primary skills do not fully answer the question or solve the task, use these secondary AEM EDS skills as fallback or supporting workflows:

- `analyze-and-plan`
- `authoring-analysis`
- `block-collection-and-party`
- `block-inventory`
- `code-review`
- `content-driven-development`
- `content-modeling`
- `docs-search`
- `find-test-content`
- `generate-import-html`
- `identify-page-structure`
- `page-decomposition`
- `page-import`
- `preview-import`
- `scrape-webpage`
- `testing-blocks`

Use any other available skills as the agent sees fit when they materially improve accuracy, speed, or implementation quality.

## Research Rules

- Never assume drop-in slot names, event payloads, container props, or API signatures.
- Research first using official Adobe Commerce and EDS documentation, local type definitions, README files, and existing code.
- Prefer primary sources and project-local patterns over guesswork.
- If documentation and implementation differ, treat the code and type definitions as the source of truth for the current project state.

## Adobe Commerce EDS Development Rules

- Stay within storefront-only customization unless the user explicitly switches scope and tooling.
- Prefer extending existing blocks and patterns over creating new ones.
- Use native DOM APIs such as `document.createElement()` for new DOM construction.
- Avoid template-literal HTML generation for block markup unless the project already relies on that pattern and there is a strong reason.
- Favor CSS for visual changes and JavaScript only when behavior or dynamic rendering requires it.
- Keep solutions compatible with Adobe Commerce storefront upgrade paths.
- Do not modify generated or vendored drop-in artifacts unless the project explicitly documents that workflow.

## Repository Conventions

Common areas in Adobe Commerce EDS storefront repositories:

- `blocks/` for block code and styles
- `scripts/` for bootstrapping, utilities, and initializers
- `scripts/initializers/` for drop-in and feature initialization
- `styles/` for global tokens and styling
- `tools/`, `plugins/`, or project-specific folders when present
- `component-models.json`, `component-definition.json`, and related models when authoring definitions are in use

Inspect the local repository before making assumptions about exact structure.

## GitHub Repository Workflow

- Read the nearest `README.md`, `package.json`, and local build scripts before changing project behavior.
- Prefer small, focused changes over broad refactors unless the task requires broader restructuring.
- Do not revert unrelated user changes.
- Run relevant linting, tests, and build checks when available.
- Summarize what changed, what was verified, and any remaining risks.

## da.live Content Workflow

This project includes a `da.live` content workflow. When content work is involved:

- Optimize content structures for non-technical authors.
- Prefer content models that are easy to paste, review, and maintain in `da.live`.
- Keep tables and authored structures predictable and clean.
- Use `da-content-pipeline` when converting generated HTML into DA-friendly structures.
- Preserve a clear distinction between content and configuration.
- When creating import-ready content, ensure the output is easy to paste into `da.live` with minimal cleanup.
- If a page import or migration task is requested, consider using the secondary import skills before inventing a new workflow.

## Testing Expectations

- Test UI changes in a real browser whenever possible.
- Verify desktop and mobile behavior for layout or interaction changes.
- Check accessibility basics for focus order, semantic structure, button/link behavior, and visible states.
- Run linting and other available checks before concluding work.
- If testing could not be completed, state that clearly.

## Commands

Update these commands per project. Typical Adobe Commerce EDS commands include:

- Install dependencies: `npm install`
- Start local dev server: `npm start`
- Start local dev server with agent-authored HTML when applicable: `aem up --html-folder="./drafts/agents"`
- Reinstall drop-ins: `npm run install:dropins`
- Lint: `npm run lint`
- Auto-fix lint issues: `npm run lint:fix`
- Build JSON models when used: `npm run build:json`

## Visual Theming Instructions

Every new storefront implementation should align to a clear visual direction before coding. Use this section to define the intended look and feel.

### Brand Direction

- Brand personality: modern b2b portal to purchase hard drives
- Visual keywords: cutting-edge, modern, shoppable
- Desired customer impression: modern and accessible UI

### Color System

- Primary color: #6EBE49
- Secondary color: #FFFFFF
- Accent color: #000000
- Background color: #FFFFFF
- Surface color: `#F4F4F4
- Text color: #000000
- Success: s: #6EBE49
- Warning: #F5A623
- Error: #D0021B

### Typography

- Heading font direction: Your preference
- Body font direction: Your preference
- Tone: Your preference

### UI Direction

- Buttons: minimal, high contrast
- Cards and surfaces: flat, subtle elevation
- Imagery style: clean ecommerce, tech-focused
- Motion guidance: subtle
- Density: balanced

### Reference Websites

Use these websites to shape layout, tone, pacing, merchandising style, and interaction direction. Do not clone them directly; use them as references only.

1. seagate.com - color scheme and block layout
2. https://www.seagate.com/products/hyperscale-and-cloud/ - products to be sold on the site


### Theming Rules

- Preserve the project's brand system and do not introduce arbitrary styles.
- Prefer design tokens and reusable CSS variables over one-off values.
- Keep merchandising, storytelling, and CTAs consistent across blocks and drop-ins.
- Ensure new work feels intentional on both desktop and mobile.

## Content Modeling Guidance

- Design for authors first.
- Prefer content blocks over config-heavy authoring when possible.
- Keep field names and table structures intuitive.
- Separate reusable patterns from page-specific content.
- If a structure would be confusing to a non-technical author, simplify it.

## Review and Delivery

When completing work:

- Summarize the user-facing outcome.
- List validation steps performed.
- Note any gaps, assumptions, or follow-up work.
- Recommend next steps only when they are genuinely useful.

## Notes for Customization

This file is a template. Before reusing it in another Adobe Commerce EDS project, update:

- Project name and environment URLs
- Commerce offering and deployment assumptions
- GitHub and `da.live` repository links
- Visual theme values
- Reference websites
- Project-specific commands
- Any required nested `AGENTS.md` files for subdirectories or specialized workflows
