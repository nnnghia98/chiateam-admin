---
name: ui-development
description: Develop and refactor UI in this Next.js, React, Tailwind, and TypeScript codebase with correct component reuse, file placement, and page structure. Use when requests mention "UI", "this page", "on screen", or "this layout", or when Codex needs to implement or clean up a screen while preferring existing components in `src/components/ui`, splitting oversized page files into modules, avoiding duplicate components, and keeping styles aligned with shared tokens and variants.
---

# UI Development

Build UI by reusing the repo's existing primitives first, placing code in the correct layer, and keeping route files thin.

Follow this skill when implementing a new screen, cleaning up an existing page, or introducing a new component for the app.

## Workflow

1. Inspect before coding.
   Search `src/components/ui` for an existing primitive before creating anything new.
   Check the target route and nearby files for established patterns before choosing a structure.

2. Decide the placement.
   Use [repo-conventions.md](references/repo-conventions.md) to choose where the code belongs.
   Keep `src/app/**/page.tsx` focused on page assembly and page-level data flow.

3. Compose from shared primitives.
   Prefer `Button`, `Card`, `Input`, `Label`, `Table`, `Sheet`, and other existing `src/components/ui/*` primitives.
   Extend existing variants or shared props before cloning markup or creating near-duplicate components.

4. Extract when the page grows.
   Treat 200+ lines as a warning and 300+ lines as a strong signal to split.
   Move large sections, repeated markup, forms, tables, dialogs, and view-specific widgets into route-level modules.

5. Keep styling reusable.
   Prefer shared Tailwind tokens, semantic utility classes, and existing variants.
   Avoid hardcoded colors in feature code unless updating the shared design tokens or a shared primitive.

6. Verify the result.
   Check mobile and desktop layouts.
   Confirm the new UI still uses existing shared primitives wherever possible.

## Placement Rules

Use these rules in order:

- Put route entry files in `src/app/**/page.tsx`.
  Keep them thin. They should assemble sections, trigger data loading, and connect page-level state.

- Put route-specific UI pieces in `src/app/<route>/module/*`.
  Use this for sections, forms, tables, dialogs, cards, and page-only hooks or helpers that are not shared elsewhere.

- Put reusable primitives in `src/components/ui/*`.
  Only create a new file here when no suitable primitive exists and the component is generic enough to be reused across screens.

- Put cross-page, non-primitive shared components in `src/components/*`.
  Use this for shared navigation, dashboards, shells, and other app-specific building blocks that are broader than one route.

- Put shared utilities in `src/lib/*`, shared types in `src/types/*`, and shared contexts in `src/contexts/*`.

## Component Rules

- Search `src/components/ui` before creating a new component.
- Reuse an existing primitive even if it needs a small variant extension.
- Create a new `src/components/ui/*` primitive only when the repo does not already have one.
- Do not duplicate an existing component with a slightly different class list.
- Do not leave large inline subcomponents inside `page.tsx` when they can live in `module/` or `src/components/`.

When a new primitive is needed:

1. Make it generic enough for reuse.
2. Align it with existing `class-variance-authority` and `cn` patterns when appropriate.
3. Export it from a dedicated file in `src/components/ui`.
4. Consume it from pages or route modules instead of embedding the same markup repeatedly.

## Styling Rules

- Prefer semantic classes such as `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, and shared `airbnb` tokens from Tailwind config.
- Prefer shared variants in UI primitives over one-off class combinations in pages.
- Avoid introducing raw hex classes like `text-[#222222]` or `bg-[#ff385c]` in new feature code unless you are updating shared tokens or matching an existing primitive that should later be centralized.
- If styling repetition appears in multiple screens, move it into a shared primitive or variant instead of copying it.

## Refactor Rules For Long Files

When a page is too long:

- Keep the route file as the orchestrator.
- Extract large sections into `src/app/<route>/module/*`.
- Extract reusable pieces into `src/components/*` or `src/components/ui/*` depending on their reuse level.
- Keep parsing, mapping, and UI formatting helpers near the module if they are route-specific.
- Move shared helpers and types out of the route when multiple screens can use them.

Good candidates to extract:

- Form panels
- Data tables
- Dialog or sheet content
- Header/action bars
- Empty states
- Repeated cards
- Inline helper components

## Decision Checks

Before finishing, verify:

- Did I search `src/components/ui` first?
- Is the route file still reasonably small and readable?
- Did I put the code in `page.tsx`, `module/`, `src/components/`, or `src/components/ui/` for a clear reason?
- Did I extend an existing component instead of duplicating one?
- Did I avoid new hardcoded colors when a shared token or variant would work?
- Does the UI hold up on smaller screens?

## Reference

- Read [repo-conventions.md](references/repo-conventions.md) when choosing placement or deciding how aggressively to split a page.
