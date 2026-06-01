# Explore — Dashboard UI Modernization

**Change**: `dashboard-ui-modernization`
**Date**: 2026-06-01
**Skills consulted**: `kpi-dashboard-design` (9.4K installs), `tailwind-design-system` (1.1K installs)

## 1. Current visual state

The dashboard already follows several modern patterns (semantic color tokens, Inter font, responsive grid, dark mode toggle), but several elements feel dated:

| Element | Current | Issue (vs. modern dashboards) |
|---|---|---|
| `MetricCard` background | `bg-green-50`, `bg-red-50`, `bg-blue-50` (color-tinted) | Tinted cards feel 2018-era. Modern finance dashboards (Mercury, Stripe, Wealthfront) use neutral backgrounds with colored accents only on the value or sparkline. |
| `MetricCard` value size | `text-2xl font-bold` | Too small for hero KPIs. Modern dashboards use `text-3xl` or `text-4xl` for the headline number, with a smaller `text-sm` for label and trend. |
| `MetricCard` icon | Unicode arrows (`↑`, `↓`, `↔`) | Emoji-ish. Modern dashboards use lucide/heroicons SVGs for crispness. |
| KPI cards lack context | Static value only | No trend line, no % change vs. previous month, no comparison anchor. This is the #1 finding from `kpi-dashboard-design` ("Show context — Comparisons, trends, targets"). |
| Section spacing | `space-y-8` everywhere | OK, but no visual rhythm (e.g. no section headers, no dividers). |
| Chart cards | `shadow-md p-6 border` | Hard borders feel heavy. Modern = softer shadows + light borders. |
| Dark mode toggle | Inline `<script>` in MainLayout (not `is:inline`) | Runs after first paint → potential flash. Should be `is:inline` to apply class before body renders. |
| Typography | Single weight scale (regular/bold) | No display/heading family distinct from body. |
| Card hover states | None | No interaction feedback. |
| Focus rings | Default browser outlines | Not keyboard-accessible styled. |

## 2. Component inventory (what needs touching)

### Must change (Phase 1+2)
- `src/presentation/components/MetricCard.tsx` — full redesign: sparkline, trend %, neutral background
- `src/presentation/components/Dashboard.tsx` — pass trend data to MetricCard, restructure grid
- `src/styles/global.css` — add `.card-modern`, `.btn-modern`, update `.card` if needed
- `tailwind.config.mjs` — add `boxShadow.glow`, optional oklch for selected tokens

### Should change (Phase 1+2)
- `src/presentation/components/CategoryChart.tsx`, `ExpenseChart.tsx`, `BalanceBurndownChart.tsx`, `ProjectionCard.tsx`, `MonthlyComparison.tsx` — apply `.card-modern` wrapper
- `src/presentation/layouts/MainLayout.astro` — fix dark mode script to be `is:inline`

### Defer (Phase 3+4)
- `TransactionList.tsx`, `TransactionForm.tsx`, `CategoryManager.tsx`, `MigrationDialog.tsx`, `AuthControls.tsx` — apply modern styling but no deep redesign
- Dark mode audit (contrast checks) — separate pass
- Typography scale expansion — separate pass

## 3. Token audit

### What's good (keep)
- ✅ Semantic palette (primary/accent/warning/danger/surface) with 50–950 scales
- ✅ `font-sans: Inter` consistent across the app
- ✅ Custom shadows (`shadow-soft`, `shadow-card`)
- ✅ Animations (`fade-in`, `slide-up`) already defined but not widely used

### Gaps
- ❌ No `oklch` colors (the skill recommends for perceptual uniformity). **Decision: skip for v1** — Tailwind v3 doesn't support oklch tokens natively and re-encoding every scale is high-effort, low-impact for a single dashboard. Hex is fine.
- ❌ No foreground tokens per color (e.g. `primary-fg`). Current pattern: ad-hoc dark mode classes like `text-green-700 dark:text-green-300`. **Decision: leave as-is** — ad-hoc works and the skill's foreground pairing applies to shadcn-style CSS variable systems, not our token system.
- ❌ No consistent `.card` variant for the new modern look. **Action: add `.card-modern` component class** alongside existing `.card`.

## 4. Risk areas

- **Chart.js** — `borderDash` scriptable already fixed (returns `[]` not `undefined`). No further changes to chart configs in this change.
- **Clerk-provided UI** — `<SignIn>`, `<UserButton>`, etc. We don't restyle these. Only the surrounding wrapper.
- **CSS bundle size** — adding new component classes is fine, no risk of bloat.
- **Dark mode contrast** — current palette has `green-700` on `green-50` and similar; should audit but not block this change.
- **No tests** for visual changes — we'll verify by `npm run build` + manual screenshot after deploy.

## 5. Recommended scope (this change)

**Do now (this change)**:
- Phase 1: KPI cards with sparkline + trend % (high impact, isolated to MetricCard + Dashboard)
- Phase 2: `.card-modern` wrapper applied to all chart cards (medium impact, low effort)
- Phase 1.5: Fix dark mode flash by moving script to `is:inline` (5-min fix, prevents future regression)

**Defer to a future change**:
- Phase 3: Typography polish
- Phase 4: Full dark mode audit + accessibility

## 6. Trend data availability (for KPI sparklines)

`useFinancialMetrics(transactions, balance)` already returns computed metrics. We can derive trend data from `transactions.value`:
- 6 trailing months of net flow → sparkline series
- This month vs last month → % change
- Both are computable client-side; no new data needed.

## 7. Component dependencies (for apply phase)

```
MetricCard (modified)
  ↑
Dashboard (modified — passes sparkline data + trend %)
  ↑
styles/global.css (modified — adds .card-modern)
  ↑
tailwind.config.mjs (modified — adds shadow.glow, optionally)
```

No new dependencies. No new packages. Pure CSS/component refactor.

## 8. Acceptance criteria (for verify phase)

- [ ] `MetricCard` shows a 6-month sparkline of the metric
- [ ] `MetricCard` shows % change vs previous month with up/down arrow
- [ ] `MetricCard` background is neutral (not color-tinted)
- [ ] All chart cards use `.card-modern` (softer shadow, subtle border, hover state)
- [ ] Dark mode toggle no longer flashes light→dark on page load
- [ ] Build passes, deploy succeeds
- [ ] No regression: existing functionality (CRUD, migration, auth) still works

## 9. Out of scope

- Migrating to Tailwind v4
- Adopting shadcn/ui
- oklch color migration
- Full dark mode contrast audit
- New page sections or features
- Mobile-specific redesign (existing responsive grid stays)
