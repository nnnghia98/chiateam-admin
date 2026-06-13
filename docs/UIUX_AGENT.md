# UI/UX Agent Instruction Guide

> This document is the **single source of truth** for building and modifying UI in the Chiateam Admin panel. Every new page, component, or edit must follow these conventions. Read this before writing any JSX.

---

## 1. Tech Stack & Constraints

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v3 + custom tokens in `globals.css`
- **UI primitives**: shadcn/ui (`Card`, `Button`, `Input`, `Label`, `Sheet`, `Table`)
- **Icons**: `lucide-react`
- **Dark mode**: Class-based (`html.dark`) — Tailwind `darkMode: ['class']`
- **Font**: Inter (Google Fonts, loaded in `layout.tsx`)

---

## 2. Design Tokens — Always Use These

### Colors

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| Brand / CTA accent | `#ff385c` | `#ff385c` (same) | Buttons (dark bg), active nav, price, score highlights |
| Brand dark | `#e00b41` | `#e00b41` | Hover on brand elements |
| Text primary | `#222222` | `#f5f5f5` | All body text, headings |
| Text secondary | `#6a6a6a` | `#a3a3a3` | Descriptions, subtitles, empty states |
| Text disabled | `rgba(0,0,0,0.24)` | `rgba(255,255,255,0.24)` | Disabled inputs/labels |
| Surface (bg) | `#f5f5f5` | `#111111` | Page background |
| Card / Panel | `#ffffff` | `#1c1c1e` | Card backgrounds, modals |
| Subtle surface | `#f2f2f2` | `#2a2a2a` | Chips, badges, icon circles, sidebar hover |
| Border | `#c1c1c1` | `#2e2e2e` | Card borders, dividers |
| Deep border | `#e0e0e0` | `#3a3a3a` | Input borders, subtle dividers |
| Error text | `#c13515` | `#ff6b6b` | Form errors |
| Legal / info | `#428bff` | `#5aa3ff` | Info links |

> **Rule**: Never use raw `#000000` (pure black) for text. Always `#222222` in light or `#f5f5f5` in dark.

### Shadows — Three-Layer System

```css
/* Card (Level 1) — use on all elevated surfaces */
box-shadow: rgba(0,0,0,0.02) 0px 0px 0px 1px,
            rgba(0,0,0,0.04) 0px 2px 6px,
            rgba(0,0,0,0.1)  0px 4px 8px;

/* Hover (Level 2) — interactive lift on hover */
box-shadow: rgba(0,0,0,0.08) 0px 4px 12px;

/* Focus/Active (Level 3) — focused elements */
box-shadow: rgb(255,255,255) 0px 0px 0px 4px,
            rgba(0,0,0,0.2)  0px 0px 0px 6px;
```

**Tailwind classes**: `shadow-airbnb-card`, `shadow-airbnb-hover`, `shadow-airbnb-focus`

### Border Radius Scale

| Class | Value | Usage |
|---|---|---|
| `rounded-sm` (4px) | 4px | Small text links, micro elements |
| `rounded-airbnb` | 8px | Buttons, inputs, tabs, chips |
| `rounded-badge` | 14px | Status badges, number labels |
| `rounded-card` | 20px | Feature cards, large buttons |
| `rounded-large` | 32px | Hero cards, modals, panel containers |
| `rounded-full` | 50% | Avatars, icon buttons, nav controls |

### Typography Reference

| Use case | Size | Weight | Letter Spacing | Class pattern |
|---|---|---|---|---|
| Page heading (H1) | `text-2xl sm:text-3xl` | `font-bold` | `-0.02em` (global rule) | — |
| Section heading (H2) | `text-xl` | `font-semibold` | — | — |
| Card title | `text-base` | `font-semibold` | — | — |
| Body / description | `text-sm` | `font-normal` or `font-medium` | — | — |
| Caption / label | `text-xs` | `font-medium` or `font-semibold` | — | `uppercase tracking-wide` for section labels |
| Micro badge | `text-[11px]` | `font-semibold` | — | — |

---

## 3. Layout Shell

The app uses a **two-layout pattern** managed by `client-layout.tsx`:

```
Mobile (< 1024px)                Desktop (≥ 1024px)
┌──────────────────────┐         ┌────────┬──────────────────────┐
│  ☰  Chiateam  🌙    │         │  SIDE  │                      │
│──────────────────────│         │  BAR   │   <main> content     │
│                      │         │  w-64  │   px-4 py-6          │
│   <main> content     │         │  (or   │   lg:px-8 lg:py-8    │
│   px-4 py-6          │         │   w-16 │                      │
│                      │         │  icon) │                      │
└──────────────────────┘         └────────┴──────────────────────┘
```

### Page container pattern

Every page's root element must follow this structure:

```tsx
<div className="space-y-6">
  {/* Page header */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] dark:text-[#f5f5f5] tracking-tight">
        Page Title
      </h1>
      <p className="text-[#6a6a6a] dark:text-[#a3a3a3] mt-1 text-sm">
        Subtitle or description
      </p>
    </div>
    {/* Optional CTA button (admin only, right-aligned) */}
    <Button className="rounded-airbnb bg-[#222222] dark:bg-[#ff385c] hover:bg-[#333] dark:hover:bg-[#e00b41] text-white w-full sm:w-auto">
      <Plus className="w-4 h-4 mr-2" />
      Action
    </Button>
  </div>

  {/* Page content */}
  ...
</div>
```

---

## 4. Loading States — Skeleton Pattern

**Never use plain text `"Loading..."`.** Always use skeleton components from `@/components/skeleton`.

### Available skeletons

```tsx
import {
  Skeleton,           // base primitive: <Skeleton className="h-4 w-32" />
  StatCardSkeleton,   // dashboard stat card
  PlayerCardSkeleton, // player list item (mobile card)
  MatchCardSkeleton,  // match list item (mobile card)
  LeaderboardCardSkeleton, // leaderboard entry (mobile card)
  PodiumSkeleton,     // leaderboard top-3 podium
  TableRowSkeleton,   // generic table row
} from '@/components/skeleton';
```

### Pattern

```tsx
if (loading) {
  return (
    <div className="space-y-6">
      {/* Mimic the page header */}
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Mimic the content shape */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <PlayerCardSkeleton key={i} />  // use appropriate variant
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Responsive Table Strategy

### Rule: mobile card view + desktop table

For any page with a data list, render **two versions** and use CSS to show/hide:

```tsx
{/* Mobile: Card list — visible below md */}
<div className="md:hidden space-y-3">
  <p className="text-xs font-semibold uppercase tracking-wide text-[#6a6a6a] dark:text-[#a3a3a3]">
    All Items ({items.length})
  </p>
  {items.map(item => (
    <ItemCard key={item.id} item={item} />
  ))}
</div>

{/* Desktop: Table — visible from md up */}
<Card className="hidden md:block dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
  <CardHeader>...</CardHeader>
  <CardContent>
    <Table>...</Table>
  </CardContent>
</Card>
```

### Mobile card anatomy

Each mobile card should be:

```tsx
<div className="bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card p-4">
  <div className="flex items-start justify-between gap-3">
    {/* Primary info (left) */}
    <div className="flex-1 min-w-0 space-y-1">
      {/* Row 1: Primary identifier + key value */}
      <div className="flex items-center gap-2">
        <span className="inline-flex ... bg-[#f2f2f2] dark:bg-[#2a2a2a] px-2 py-0.5 rounded-badge text-xs font-semibold text-[#222222] dark:text-[#f5f5f5]">
          Badge
        </span>
        <span className="font-semibold text-[#222222] dark:text-[#f5f5f5] text-sm truncate">
          Primary name
        </span>
      </div>
      {/* Row 2: Secondary info with icon */}
      <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3] flex items-center gap-1">
        <Icon className="w-3 h-3" />
        Secondary info
      </p>
      {/* Row 3: Tertiary / date info */}
      <p className="text-xs text-[#c1c1c1] dark:text-[#5a5a5a]">
        Tertiary detail
      </p>
    </div>

    {/* Actions (right) — admin only */}
    <div className="flex gap-2 flex-shrink-0">
      <Button variant="outline" size="sm" className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a] w-8 h-8 p-0">
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button variant="destructive" size="sm" className="rounded-airbnb w-8 h-8 p-0">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>
</div>
```

---

## 6. Cards & Panels

### Standard data card

```tsx
<Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
  <CardHeader className="pb-3">
    <CardTitle className="text-base font-semibold text-[#222222] dark:text-[#f5f5f5]">
      Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    ...
  </CardContent>
</Card>
```

### Stat card (dashboard KPI)

```tsx
<Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card hover:shadow-airbnb-hover transition-shadow">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
    <CardTitle className="text-xs sm:text-sm font-medium text-[#6a6a6a] dark:text-[#a3a3a3]">
      Label
    </CardTitle>
    <div className="w-8 h-8 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a] flex items-center justify-center">
      <Icon className="h-4 w-4" style={{ color: '#ff385c' }} />
    </div>
  </CardHeader>
  <CardContent className="px-4 pb-4">
    <div className="text-xl sm:text-2xl font-bold text-[#222222] dark:text-[#f5f5f5]">
      {value}
    </div>
    <p className="text-xs text-[#6a6a6a] dark:text-[#a3a3a3] mt-0.5 truncate">
      {subtitle}
    </p>
  </CardContent>
</Card>
```

Stat card grids: `grid grid-cols-2 lg:grid-cols-4 gap-4`

---

## 7. Buttons

| Context | Classes |
|---|---|
| **Primary CTA** | `rounded-airbnb bg-[#222222] dark:bg-[#ff385c] hover:bg-[#333] dark:hover:bg-[#e00b41] text-white` |
| **Secondary / outline** | `variant="outline"` + `rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a]` |
| **Destructive** | `variant="destructive"` + `rounded-airbnb` |
| **Ghost / text** | `variant="ghost"` + `text-[#6a6a6a] dark:text-[#a3a3a3] hover:text-[#222222] dark:hover:text-white` |
| **Icon button (small)** | Add `w-8 h-8 p-0` to any size="sm" variant |

> **Rule**: Never use Rausch Red (`#ff385c`) as a button background in light mode. In light mode, primary buttons are near-black (`#222222`). Red is used in dark mode buttons and for accent/active states only.

---

## 8. Forms

### Form card wrapper

```tsx
<Card className="dark:bg-[#1c1c1e] dark:border-[#2e2e2e] shadow-airbnb-card">
  <CardHeader>
    <CardTitle className="dark:text-[#f5f5f5]">Create / Edit Title</CardTitle>
    <CardDescription className="dark:text-[#a3a3a3]">
      Subtitle description
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Field grid: 1 col mobile → 2-3 col tablet/desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="field" className="dark:text-[#f5f5f5]">Field *</Label>
          <Input
            id="field"
            className="rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5]"
          />
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button type="submit" className="rounded-airbnb bg-[#222222] dark:bg-[#ff385c] hover:bg-[#333] dark:hover:bg-[#e00b41] text-white">
          Submit
        </Button>
        <Button type="button" variant="outline" onClick={cancel}
          className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a]">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  </CardContent>
</Card>
```

### Input with icon

```tsx
<div className="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c1c1c1] dark:text-[#5a5a5a]" />
  <Input
    className="pl-10 rounded-airbnb dark:bg-[#111111] dark:border-[#2e2e2e] dark:text-[#f5f5f5] focus:border-[#ff385c] focus:ring-1 focus:ring-[#ff385c]"
  />
</div>
```

---

## 9. Tables (Desktop)

```tsx
<Table>
  <TableHeader>
    <TableRow className="dark:border-[#2e2e2e]">
      <TableHead className="dark:text-[#a3a3a3]">Column</TableHead>
      <TableHead className="text-right dark:text-[#a3a3a3]">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id} className="dark:border-[#2e2e2e]">
        <TableCell className="font-medium text-[#222222] dark:text-[#f5f5f5]">
          Primary value
        </TableCell>
        <TableCell className="text-[#6a6a6a] dark:text-[#a3a3a3]">
          Secondary value
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" className="rounded-airbnb dark:border-[#2e2e2e] dark:text-[#f5f5f5] dark:hover:bg-[#2a2a2a]">
            <Pencil className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 10. Dark Mode Rules

1. **Every background** needs a `dark:` counterpart:
   - `bg-white` → add `dark:bg-[#1c1c1e]`
   - `bg-[#f2f2f2]` → add `dark:bg-[#2a2a2a]`
   - `bg-[#f5f5f5]` (page bg) → add `dark:bg-[#111111]`

2. **Every text color** needs a `dark:` counterpart:
   - `text-[#222222]` → add `dark:text-[#f5f5f5]`
   - `text-[#6a6a6a]` → add `dark:text-[#a3a3a3]`
   - `text-[#c1c1c1]` → add `dark:text-[#5a5a5a]`

3. **Every border** needs a `dark:` counterpart:
   - `border-[#c1c1c1]` → add `dark:border-[#2e2e2e]`
   - `border-[#f2f2f2]` → add `dark:border-[#2e2e2e]`

4. **Do NOT** add `dark:` to `text-[#ff385c]` — brand red is the same in both modes.

5. **The theme toggle** (`ThemeToggle` component from `@/components/theme-toggle`) handles the class. Do not add dark mode JS manually.

---

## 11. Navigation Integration

The sidebar (`navigation.tsx`) and top bar are shared components — **never duplicate navigation in a page file**.

Active link styling (sidebar):
```css
bg-[#fff0f2] dark:bg-[#3a1020] text-[#ff385c] border-l-2 border-[#ff385c]
```

Inactive link styling (sidebar):
```css
text-[#6a6a6a] dark:text-[#a3a3a3] hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a] hover:text-[#222222] dark:hover:text-white border-l-2 border-transparent
```

To add a new page to the nav: add its entry to the `links` array in `navigation.tsx`.

---

## 12. Status Banners & Alerts

### Unsaved changes (sticky)

```tsx
{dirty && (
  <div className="sticky top-14 lg:top-0 z-30 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-airbnb px-3 py-2.5 flex items-center justify-between gap-3">
    <span>⚠️ You have unsaved changes</span>
    <button onClick={save} className="font-semibold underline underline-offset-2">
      Save now
    </button>
  </div>
)}
```

### Error state

```tsx
{error && (
  <div className="text-sm text-[#c13515] dark:text-[#ff6b6b] bg-red-50 dark:bg-[#3a1010] p-3 rounded-airbnb border border-red-100 dark:border-[#5a1010]">
    {error}
  </div>
)}
```

### Empty state

```tsx
<div className="bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card p-8 text-center text-[#6a6a6a] dark:text-[#a3a3a3] text-sm">
  No items yet
</div>
```

---

## 13. Section Label Pattern

Used above card lists or grouped content:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-[#6a6a6a] dark:text-[#a3a3a3]">
  All Players (12)
</p>
```

---

## 14. Responsive Grid Cheat Sheet

| Content type | Mobile | Tablet | Desktop |
|---|---|---|---|
| Stat cards | `grid-cols-2` | — | `lg:grid-cols-4` |
| Form fields | `grid-cols-1` | `sm:grid-cols-2` | `lg:grid-cols-3` |
| Content panels | `grid-cols-1` | — | `lg:grid-cols-2` |
| Team columns (next-match) | `grid-cols-1` | `sm:grid-cols-2` | `sm:grid-cols-3` |
| Page header | `flex-col` | `sm:flex-row` | — |

---

## 15. Quick Reference Checklist

Before submitting any UI change, verify:

- [ ] All `bg-white` cards have `dark:bg-[#1c1c1e]`
- [ ] All primary text has `dark:text-[#f5f5f5]`
- [ ] All secondary text has `dark:text-[#a3a3a3]`
- [ ] All borders have `dark:border-[#2e2e2e]`
- [ ] Loading state uses skeleton components (not plain text)
- [ ] Tables have a mobile card fallback (`md:hidden` / `hidden md:block`)
- [ ] Page H1 uses `text-2xl sm:text-3xl font-bold tracking-tight` with dark variant
- [ ] Page header stacks on mobile (`flex-col sm:flex-row`)
- [ ] CTA button is `w-full sm:w-auto`
- [ ] All `rounded-` values follow the radius scale (prefer `rounded-airbnb`, `rounded-card`, `rounded-large`)
- [ ] Box shadows use `shadow-airbnb-card` or the three-layer inline style — no generic Tailwind shadows
- [ ] No raw `shadow-lg`, `shadow-xl`, or `shadow-md` — use the Airbnb shadow system
- [ ] `suppressHydrationWarning` added to any element rendering `new Date().toLocaleString()`

---

## 16. Files Reference

| File | Purpose |
|---|---|
| `src/app/globals.css` | CSS variables (light + dark), shimmer animation, scrollbar |
| `src/components/navigation.tsx` | Sidebar (desktop) + top bar + drawer (mobile) |
| `src/components/client-layout.tsx` | Auth guard + sidebar margin wiring |
| `src/components/skeleton.tsx` | All skeleton loading components |
| `src/components/theme-toggle.tsx` | Sun/Moon dark mode toggle button |
| `src/contexts/auth-context.tsx` | `useAuth()` → `{ role, canEdit, login, logout }` |
| `src/contexts/sidebar-context.tsx` | `useSidebar()` → `{ collapsed, toggle }` |
| `src/lib/api-client.ts` | All API calls |
| `tailwind.config.js` | Custom tokens: `airbnb-*` colors, `shadow-airbnb-*`, `rounded-airbnb/card/large/badge` |
| `DESIGN.md` | Full visual design philosophy and token definitions |
