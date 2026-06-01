# Proposal — Dashboard UI Modernization

**Change**: `dashboard-ui-modernization`
**Mode**: auto / hybrid (engram + openspec)
**Date**: 2026-06-01

## Intent

Refresh the visual layer of the Finance Dashboard to feel current, while preserving all existing functionality (auth, Clerk+Supabase migration, CRUD, charts, projections).

Two specific, scoped goals:

1. **Make the 3 KPI hero cards communicate context** — not just a snapshot value, but a 6-month sparkline and a month-over-month % trend, with a neutral (not color-tinted) background. This is the highest-impact visual change and is grounded in the `kpi-dashboard-design` rule "Show context — Comparisons, trends, targets".

2. **Apply a consistent modern card surface** — softer shadows, subtle borders, hover states — across all chart cards. Grounded in `tailwind-design-system` rule "Single source of truth" (one `.card-modern` class used everywhere) and `kpi-dashboard-design` rule "White space aids comprehension".

A small bonus: fix the dark-mode flash by moving the theme-detection inline script to `is:inline` so the `dark` class is applied before first paint.

## Scope

### In
- `MetricCard` redesign (new component, kept under same path)
- `Dashboard.tsx` updates to pass trend data and restructure the grid
- New `.card-modern` CSS component class
- Apply `.card-modern` to: `CategoryChart`, `ExpenseChart`, `BalanceBurndownChart`, `ProjectionCard`, `MonthlyComparison`
- New `boxShadow.glow` token in `tailwind.config.mjs`
- Fix dark-mode flash in `MainLayout.astro` (`is:inline`)
- New `useMonthlyTrend(transactions)` helper in `useFinancialMetrics.ts` (returns last 6 months of net flow + % change vs prior month)

### Out
- `TransactionList`, `TransactionForm`, `CategoryManager`, `MigrationDialog`, `AuthControls` — keep current styling
- New sections, new features, new data
- Dark mode contrast audit
- Tailwind v4 migration
- shadcn/ui adoption
- oklch color migration
- Mobile redesign (existing responsive grid stays)

## Approach

### Step 1: Build the trend helper (pure function, no UI)
Add `useMonthlyTrend(transactions, lookbackMonths = 6)` to `useFinancialMetrics.ts`. Returns:
- `series: number[]` (length 6, oldest → newest)
- `changePct: number | null` (this month vs last, or null if no prior month)
- `direction: 'up' | 'down' | 'flat'`

For "balance", trend = monthly net flow. For "income" and "expense", trend = the monthly totals themselves. We expose one helper that returns the data; MetricCard chooses the semantic.

### Step 2: New `MetricCard` API
```ts
interface MetricCardProps {
  title: string;
  value: string;                    // formatted currency
  type: 'balance' | 'income' | 'expense';
  sparklineData: number[];          // 6 points
  changePct: number | null;         // null when no prior month
  icon: 'trending-up' | 'trending-down' | 'wallet';
}
```

We replace the unicode arrow icons with inline SVG (lucide-style) for crispness. Sparkline is a 60×20 SVG `<polyline>` — no new dependency on a charting library.

### Step 3: Update `Dashboard.tsx`
- Replace 3 calls to `<MetricCard>` with new props
- Wrap chart grid in `.card-modern`
- Adjust `space-y-8` → `space-y-10` for breathing room

### Step 4: `.card-modern` component class
```css
.card-modern {
  @apply bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-200/60 dark:border-surface-700/60
         p-6 transition-all duration-200 hover:shadow-glow hover:-translate-y-0.5;
}
```

The hover lift is subtle (`-translate-y-0.5` = 2px) so it doesn't feel jarring.

### Step 5: `shadow-glow` token
```js
boxShadow: {
  'soft': '...',
  'card': '...',
  'glow': '0 4px 20px -2px rgba(14, 165, 233, 0.12), 0 0 0 1px rgba(14, 165, 233, 0.05)',
}
```
A subtle primary-tinted shadow that signals interactivity on hover.

### Step 6: Dark mode flash fix
Move the `<script is:inline>` in `MainLayout.astro` to actually be `is:inline` (it already has the attribute, but verify Astro doesn't bundle it). Add `style="color-scheme: light dark"` to `<html>` to prevent scrollbar flash.

## Tradeoffs

| Option | Pro | Con | Decision |
|---|---|---|---|
| Inline SVG sparkline | No new dep, ~30 LOC, full control | Manual path math | ✅ Chosen |
| Pull in `react-sparklines` or similar | Pretty out of the box | +20KB gz, library bloat for one use | ❌ Rejected |
| Apply glassmorphism (`backdrop-blur`) | Modern feel | Performance hit on low-end devices; doesn't render well in dark mode | ❌ Rejected for v1 |
| Switch to oklch colors | Perceptual uniformity | Touches every scale; risky without visual regression tools | ❌ Deferred |
| Move to Tailwind v4 + `@theme` | Future-proof | High-effort migration | ❌ Deferred |

## Risks

- **Visual regression** — no visual tests. Mitigation: manual screenshot before/after.
- **Sparkline math errors** — off-by-one in month bucketing. Mitigation: pure function with explicit unit-style tests if possible.
- **Currency formatting consistency** — `formatCurrency` is currently defined inline in Dashboard.tsx. We extract it to a shared util so MetricCard uses the same formatter.
- **Bundle size** — adding a few component classes + a sparkline SVG is negligible (<1KB).

## Success criteria

- [ ] KPI cards show 6-month sparkline that matches the data
- [ ] KPI cards show % change vs previous month with arrow
- [ ] KPI background is neutral white/dark-surface, not tinted
- [ ] All chart cards use the same `.card-modern` surface
- [ ] Hovering a chart card produces a subtle lift + glow
- [ ] No dark-mode flash on initial page load
- [ ] `npm run build` passes
- [ ] Deploy succeeds and dashboard is visually refreshed
- [ ] No regression: existing functionality (auth, CRUD, migration) still works

## Out-of-band follow-ups (for future changes)

- Dark mode contrast audit (WCAG AA verification)
- Typography scale expansion (display, h1-h6)
- Refactor: extract `formatCurrency` to `application/utils/format.ts`
- Refactor: extract icon SVGs to `presentation/icons.ts`
- Consider `prefers-reduced-motion` for the hover lift animation
