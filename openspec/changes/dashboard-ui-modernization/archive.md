# Archive — Dashboard UI Modernization

**Change**: `dashboard-ui-modernization`
**Archived**: 2026-06-01
**Status**: SUCCESS

## Summary

Modernized the visual layer of the finance dashboard. Added KPI sparklines,
semantic trend labels, a unified `.card-modern` card surface, and fixed
the dark mode flash on first paint. No data layer or auth changes.

## Implementation

- **T1.1**: `useMonthlyTrend(transactions, metric, lookbackMonths=6)` pure helper added to `useFinancialMetrics.ts`. Returns `{ series[6], changePct, direction }` bucketed by local calendar month with zero-padding.
- **T1.2-T1.4**: `MetricCard.tsx` fully rewritten. New visual: neutral background, `text-3xl tracking-tight` value, uppercase eyebrow title, inline SVG sparkline, semantic trend label.
- **T2.1**: `boxShadow.glow` token added to `tailwind.config.mjs` (subtle primary-tinted ring + lift shadow).
- **T2.2**: `.card-modern` and `.card-modern-interactive` component classes added to `global.css` with `motion-reduce:` overrides.
- **T3.1, T3.2**: `MainLayout.astro` updated with `color-scheme: light dark` on `<html>` and a single `is:inline` script that sets the `dark` class pre-paint and binds the theme toggle click handler.
- **T4.1**: `Dashboard.tsx` imports `useMonthlyTrend`, computes 3 trends, passes them to MetricCard, root spacing bumped to `space-y-10`.
- **T5.1**: `CategoryChart`, `ExpenseChart`, and `BalanceBurndownChart` (both empty and data branches) use `.card-modern`.
- **T6.1, T6.2**: Build clean, 2 commits, pushed to `main` (will trigger GitHub Pages deploy).

## Verification

9/9 REQs PASS, 12/12 tasks DONE, build clean, 0 CRITICAL findings.
1 WARNING (soft, intentionally not fixed — display cards should not lift on hover)
1 SUGGESTION (motion-reduce is more conservative than spec — positive accessibility deviation).

## Artifacts

- `openspec/changes/dashboard-ui-modernization/explore.md`
- `openspec/changes/dashboard-ui-modernization/proposal.md`
- `openspec/changes/dashboard-ui-modernization/spec.md`
- `openspec/changes/dashboard-ui-modernization/design.md`
- `openspec/changes/dashboard-ui-modernization/tasks.md`
- `openspec/changes/dashboard-ui-modernization/verify-report.md`
- `openspec/changes/dashboard-ui-modernization/archive.md` (this file)

## Files Changed

- `src/application/hooks/useFinancialMetrics.ts` (+ useMonthlyTrend)
- `src/presentation/components/MetricCard.tsx` (full rewrite)
- `src/presentation/components/Dashboard.tsx` (wire-up + space-y-10)
- `src/presentation/components/CategoryChart.tsx` (.card-modern)
- `src/presentation/components/ExpenseChart.tsx` (.card-modern)
- `src/presentation/components/BalanceBurndownChart.tsx` (.card-modern, both branches)
- `src/styles/global.css` (+ .card-modern + .card-modern-interactive)
- `tailwind.config.mjs` (+ boxShadow.glow)
- `src/presentation/layouts/MainLayout.astro` (color-scheme + is:inline script)
- `src/infrastructure/auth/ClerkProviderWrapper.tsx` (BUILD_VERSION v8→v9, cache-bust)
- `openspec/changes/dashboard-ui-modernization/*` (5 spec artifacts)

## Out of Scope (deferred)

- `TransactionList`, `TransactionForm`, `CategoryManager`, `MigrationDialog`, `AuthControls` styling
- Dark mode contrast audit
- Typography scale expansion
- Mobile redesign
- Status pill extraction for `ProjectionCard` / `MonthlyComparison` (their color-tinted backgrounds are an intentional status indicator)
- Migrating `ProjectionCard` / `MonthlyComparison` to `.card-modern` (deferred — needs UX research on how to keep the status signal)

## Open Follow-ups (separate from this change)

- Clerk instance dev → prod migration (8-step procedure pending user action)
- Periodic visual regression audit (no tooling in place yet)
