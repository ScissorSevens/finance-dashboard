# Tasks — Dashboard UI Modernization

**Change**: `dashboard-ui-modernization`
**Date**: 2026-06-01
**Mode**: auto / hybrid (engram + openspec)

## Group A: Trend helper + MetricCard redesign

### T1.1 — Add `useMonthlyTrend` to `useFinancialMetrics.ts`
- **Description**: Export a new pure helper `useMonthlyTrend(transactions, metric, lookbackMonths=6)` that returns `{ series: number[6], changePct: number|null, direction: 'up'|'down'|'flat' }`. Buckets transactions by local calendar month, sums net flow (balance) or type-filtered amounts (income/expense), zero-pads if user has < 6 months.
- **Files**: `src/application/hooks/useFinancialMetrics.ts`
- **Acceptance**: Calling with a known transaction list returns 6 numbers; `changePct` is null when previous month is 0; `direction` matches the sign of (current - previous).
- **Depends on**: none

### T1.2 — Rewrite `MetricCard.tsx` (visual + API)
- **Description**: Replace color-tinted bg with neutral `bg-white dark:bg-surface-800`. Increase value to `text-3xl font-bold tracking-tight`. Render header (title + icon) / value / footer (sparkline + trend) layout. Use inline SVG icons (lucide-style) for `trending-up`, `trending-down`, `wallet`. New props: `title, value, type, sparklineData, changePct, icon`.
- **Files**: `src/presentation/components/MetricCard.tsx`
- **Acceptance**: Renders without errors in TypeScript. Visual: neutral bg, larger value, three-row layout.
- **Depends on**: T1.1

### T1.3 — Add inline SVG sparkline to `MetricCard.tsx`
- **Description**: Hand-rolled 60×20 SVG `<polyline>` with `viewBox="0 0 60 20"`, `preserveAspectRatio="none"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Math: min/max normalize (including 0), map to x∈[0,60] and y∈[20,0]. Color = semantic by metric. Edge cases: empty data → null, single point → center, all equal → flat at y=10.
- **Files**: `src/presentation/components/MetricCard.tsx` (same component)
- **Acceptance**: Renders with 6 points and curves smoothly. Empty series renders nothing.
- **Depends on**: T1.2

### T1.4 — Add trend label with semantic coloring to `MetricCard.tsx`
- **Description**: Show "% vs mes anterior" with arrow. Semantic direction: for income/balance, up=green, down=red. For expense, up=red, down=green. When `changePct === null` show "—". When `|changePct| < 0.05` show "0.0%" without arrow.
- **Files**: `src/presentation/components/MetricCard.tsx`
- **Acceptance**: Visual matches design.md §2.2 "TrendLabel" rules. WCAG AA contrast for both light and dark.
- **Depends on**: T1.2

## Group B: Card surface

### T2.1 — Add `boxShadow.glow` token to `tailwind.config.mjs`
- **Description**: Add `'glow': '0 4px 20px -2px rgba(14, 165, 233, 0.12), 0 0 0 1px rgba(14, 165, 233, 0.05)'` to the `boxShadow` extend block.
- **Files**: `tailwind.config.mjs`
- **Acceptance**: `shadow-glow` Tailwind class compiles in a test component.
- **Depends on**: none

### T2.2 — Add `.card-modern` and `.card-modern-interactive` to `global.css`
- **Description**: Two new component classes in the `@layer components` block. Base: neutral bg, `rounded-2xl`, `shadow-soft`, subtle border, `transition-all duration-200 ease-out`, `motion-reduce:transition-none`. Interactive variant adds `hover:shadow-glow hover:-translate-y-0.5` with `motion-reduce:` overrides.
- **Files**: `src/styles/global.css`
- **Acceptance**: `card-modern` and `card-modern-interactive` are available as CSS classes; compile without warnings.
- **Depends on**: T2.1

## Group C: Dark mode flash fix

### T3.1 — Add `color-scheme` to `<html>` in `MainLayout.astro`
- **Description**: Add `style="color-scheme: light dark"` attribute to the `<html>` element.
- **Files**: `src/presentation/layouts/MainLayout.astro`
- **Acceptance**: Browser dev tools show `color-scheme: light dark` computed on html.
- **Depends on**: none

### T3.2 — Inline the theme toggle script in `MainLayout.astro`
- **Description**: Move the click handler into the same `is:inline` `<script>` block that sets the initial class. Remove the existing non-inline `<script>` block. The inline script runs before page paint, eliminating the light→dark flash and ensuring the toggle is responsive immediately.
- **Files**: `src/presentation/layouts/MainLayout.astro`
- **Acceptance**: Page loads in dark mode (when pref) with no light flash. Toggle button responds to clicks on first interaction.
- **Depends on**: T3.1

## Group D: Wire up Dashboard

### T4.1 — Compute trends in `Dashboard.tsx` and pass to MetricCard
- **Description**: Import `useMonthlyTrend`. Call it for balance, income, expense. Pass results to 3 `<MetricCard>` calls. Change `space-y-8` to `space-y-10` on the dashboard root div.
- **Files**: `src/presentation/components/Dashboard.tsx`
- **Acceptance**: Build passes. Visual: 3 KPI cards with sparkline + trend.
- **Depends on**: T1.1, T1.2, T1.3, T1.4

## Group E: Apply `.card-modern` to chart cards

### T5.1 — Wrap chart cards in `.card-modern`
- **Description**: In each of `CategoryChart.tsx`, `ExpenseChart.tsx`, `BalanceBurndownChart.tsx`, `ProjectionCard.tsx`, `MonthlyComparison.tsx`, find the existing root `<div>` (e.g. `class="bg-white rounded-xl shadow-md p-6"`) and replace with `class="card-modern"`. Don't touch inner chart rendering.
- **Files**: 5 chart components
- **Acceptance**: All chart cards have the new surface. No regression in chart functionality.
- **Depends on**: T2.2

## Group F: Build + verify

### T6.1 — Build passes
- **Description**: `npm run build` must pass without errors or warnings related to this change.
- **Files**: none (build only)
- **Acceptance**: Build completes in <30s, zero new warnings.
- **Depends on**: T4.1, T5.1

### T6.2 — Commit + push + deploy
- **Description**: Single conventional commit. Push to main. Verify GitHub Pages deploy succeeds.
- **Files**: none
- **Acceptance**: GitHub Actions run completes. Live site shows the new look.
- **Depends on**: T6.1

## Summary

- **6 groups, 12 tasks**
- **Critical path**: T1.1 → T1.2 → T4.1 (KPI cards functional)
- **Parallelizable**: T2.x, T3.x, T5.1 don't block each other
- **Estimated effort**: ~3-4 hours of focused work for a senior dev familiar with the stack
