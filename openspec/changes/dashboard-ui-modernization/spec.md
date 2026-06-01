# Spec — Dashboard UI Modernization

**Change**: `dashboard-ui-modernization`
**Date**: 2026-06-01

## Requirements

### REQ-1: KPI cards display 6-month trend sparkline
**Scenario**: A signed-in user opens the dashboard.
- **WHEN** the dashboard loads the 3 KPI cards (Balance, Ingresos del Mes, Gastos del Mes)
- **THEN** each card displays a 60×20 SVG sparkline showing the last 6 months of the relevant metric
- **AND** the sparkline line color matches the metric semantic (accent for income, danger for expense, primary for balance)
- **AND** the sparkline area is subtly filled with the same color at 10% opacity

### REQ-2: KPI cards display month-over-month % change
**Scenario**: A user with at least 2 months of transaction data opens the dashboard.
- **WHEN** the dashboard loads a KPI card
- **THEN** the card shows a small "% vs mes anterior" label with a colored arrow
- **AND** the arrow is green (up) when the change is positive for income/balance, red (down) when negative
- **AND** the arrow is red (up) when the change is positive for expense (spending more = bad), green (down) when negative
- **AND** when the previous month had no data, the % change is hidden and a neutral "—" is shown instead

### REQ-3: KPI cards use neutral background, not color-tinted
**Scenario**: Any user opens the dashboard.
- **WHEN** a KPI card renders
- **THEN** the background is `bg-white` in light mode, `dark:bg-surface-800` in dark mode
- **AND** the color-tinted backgrounds (`bg-green-50`, `bg-red-50`, `bg-blue-50`) are removed
- **AND** the metric value, icon, and trend use semantic colors as accents only

### REQ-4: KPI value typography is more prominent
**Scenario**: Any user opens the dashboard.
- **WHEN** a KPI card renders
- **THEN** the value is rendered in `text-3xl font-bold tracking-tight` (up from `text-2xl font-bold`)
- **AND** the title is rendered in `text-sm font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400`
- **AND** the trend label is `text-xs font-medium`

### REQ-5: All chart cards use the modern card surface
**Scenario**: Any user opens the dashboard.
- **WHEN** any of these components render: `CategoryChart`, `ExpenseChart`, `BalanceBurndownChart`, `ProjectionCard`, `MonthlyComparison`
- **THEN** they use the new `.card-modern` CSS class
- **AND** the surface has `rounded-2xl`, `shadow-soft`, subtle `border border-surface-200/60 dark:border-surface-700/60`
- **AND** on hover, the card lifts by 2px (`-translate-y-0.5`) and gains a `shadow-glow` (subtle primary-tinted)
- **AND** the transition is `duration-200 ease-out`

### REQ-6: Card-modern hover respects reduced-motion preference
**Scenario**: A user with `prefers-reduced-motion: reduce` enabled in their OS opens the dashboard.
- **WHEN** they hover over a `.card-modern` card
- **THEN** no translate/scale animation occurs (only color/shadow transitions remain)
- **AND** the system preference is respected via a Tailwind `motion-reduce:` variant

### REQ-7: Dark mode has no flash on initial load
**Scenario**: A user with `prefers-color-scheme: dark` (or saved dark preference) loads the dashboard.
- **WHEN** the page first renders
- **THEN** the `dark` class is applied to `<html>` BEFORE the first paint
- **AND** no light→dark transition is visible
- **AND** the inline script that sets the class is marked `is:inline` in `MainLayout.astro`
- **AND** the `<html>` element declares `color-scheme: light dark` for proper browser UI theming

### REQ-8: Trend data computation is client-side
**Scenario**: A user has transactions stored (localStorage or Supabase).
- **WHEN** `useMonthlyTrend(transactions, metric)` is called
- **THEN** it returns 6 trailing months of bucketed totals, oldest → newest
- **AND** it returns the % change of the current month vs the previous month
- **AND** bucketing is by calendar month in the user's local timezone
- **AND** the function is exported from `useFinancialMetrics.ts` for reuse

### REQ-9: Sparkline uses inline SVG (no new dependency)
**Scenario**: Bundle size audit.
- **WHEN** the sparkline is rendered
- **THEN** it's a hand-rolled SVG `<polyline>` element
- **AND** no new npm dependency is added
- **AND** the SVG is fully responsive (uses `viewBox` and `preserveAspectRatio="none"`)
- **AND** the line is anti-aliased via `stroke-linecap="round"` and `stroke-linejoin="round"`

## Constraints

- No new npm dependencies
- No migration to Tailwind v4
- No shadcn/ui adoption
- No new data sources (all client-side from existing transactions)
- No regression: existing CRUD, auth, migration, charts, projections must keep working
- All existing components must continue to render (no breaking prop changes elsewhere)

## Out of scope

- `TransactionList`, `TransactionForm`, `CategoryManager`, `MigrationDialog`, `AuthControls` styling
- Dark mode contrast audit
- Typography scale expansion
- Mobile redesign
- Accessibility audit beyond REQ-6 (reduced motion)
- New page sections or features
