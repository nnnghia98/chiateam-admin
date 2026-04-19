# Repo Conventions

Use this reference when the request is about implementing or refactoring screens in this repository.

## Current Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives in `src/components/ui`

## Current Structure

- `src/app/*`: route entry points and route-specific code
- `src/components/ui/*`: shared UI primitives
- `src/components/*`: shared app-specific components
- `src/lib/*`: utilities and clients
- `src/types/*`: shared types
- `src/contexts/*`: React contexts

## Recommended Placement

- `src/app/<route>/page.tsx`
  Use for page composition, page-level state, and route wiring.

- `src/app/<route>/module/*`
  Use for route-only sections, view components, forms, tables, dialogs, and helpers that should not live inline in the route file.

- `src/components/ui/*`
  Use for reusable primitives such as accordion, tabs, modal wrappers, or other generic building blocks.

- `src/components/*`
  Use for shared app-level composites used by more than one route.

## Existing Pain Points To Correct

- Several route files are already too long.
  Examples:
  - `src/app/next-match/page.tsx`
  - `src/app/matches/page.tsx`
  - `src/app/leaderboard/page.tsx`
  - `src/app/players/page.tsx`

- Feature code frequently hardcodes colors directly in classes.
  Prefer shared tokens and variants for new work instead of copying that pattern forward.

- Route files sometimes hold too much UI detail directly.
  Prefer extracting route-only pieces into `module/`.

## Styling Guidance

- Prefer Tailwind semantic tokens backed by globals and config:
  - `bg-background`
  - `text-foreground`
  - `border-border`
  - `text-muted-foreground`
  - `bg-primary`
  - `text-primary-foreground`

- The repo also exposes Airbnb-themed extensions in Tailwind config:
  - `airbnb.red`
  - `airbnb.red-dark`
  - `airbnb.dark`
  - `airbnb.secondary`
  - `airbnb.surface`
  - `airbnb.border`

- Prefer consuming those through shared primitives and variants instead of scattering raw hex values in pages.

## Size Heuristic

- 0-200 lines: usually acceptable
- 200-300 lines: review for extraction opportunities
- 300+ lines: split aggressively unless there is a strong reason not to
