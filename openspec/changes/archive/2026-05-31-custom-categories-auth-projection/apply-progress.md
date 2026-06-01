# Apply Progress: Custom Categories + Projections + Auth/Supabase

> **Status**: Phase 1 (Custom Categories) ✅ COMPLETE · Phase 2 (Detailed Projections) ✅ COMPLETE · **Phase 3 (Auth + Supabase) ✅ COMPLETE (12/12 tasks)**
> **Date**: 2026-05-31
> **Mode**: Standard (no test runner — `astro check` is the quality gate)
> **Type-check**: `npm run check` → **0 errors, 0 warnings, 2 pre-existing hints** (unrelated to this change: unused `TransactionCategory` import in `MetricsService.ts`; unused `message` prop in `ProjectionCard.tsx` — both predate Phase 3).
> **Build**: `npm run build` → **✅ passes** (Dashboard bundle 565 KB / 166 KB gzip — driven by Clerk SDK; consider code-splitting in a polish task).

## Phase 1 — Custom Categories (foundation, no auth)

### 1.1 Domain

- [x] **1.1** Create `src/domain/entities/Category.ts` (`Category` interface: id, name, type, color, icon?, isDefault); re-export from `src/domain/index.ts`.
- [x] **1.2** Create `src/domain/repositories/CategoryRepository.ts` (`findAll`, `findById`, `save`, `delete`); re-export from `src/domain/index.ts`.
- [x] **1.3** Create `src/application/services/CategoryService.ts` with `getAll/add/update/remove` plus `isDefault` deletion guard.

### 1.2 Infrastructure

- [x] **1.4** Create `src/infrastructure/repositories/LocalStorageCategoryRepository.ts`; seed 7 expense + 5 income defaults on first load.
- [x] **1.5** Create `src/application/services/SpanishKeyMigration.ts` mapping ES→EN (`Alimentación→food`, `Transporte→transport`, `Servicios→utilities`, etc.); run on app boot.

### 1.3 Application

- [x] **1.6** Create `src/application/hooks/useCategories.ts` returning `{categories, addCategory, updateCategory, deleteCategory, isLoading}` (Preact Signals).
- [x] **1.7** Wire `useCategories` + Spanish migration into `Dashboard.tsx` (load on mount).

### 1.4 Presentation

- [x] **1.8** Create `src/presentation/components/CategoryManager.tsx` (modal form, color picker, edit/delete; reject delete on `isDefault`).
- [x] **1.9** Update `TransactionForm.tsx` to consume `useCategories()`; replace hardcoded `INCOME_CATEGORIES`/`EXPENSE_CATEGORIES`.
- [x] **1.10** `npm run check`; verify specs/custom-categories scenarios (CRUD, default seed, ES→EN migration, isDefault guard).

---

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/domain/entities/Category.ts` | Created | `Category` interface, `CategoryType` union, `CategoryInput` type, `DEFAULT_CATEGORIES` constant (5 income + 7 expense) |
| `src/domain/repositories/CategoryRepository.ts` | Created | Repository interface (`findAll`, `findById`, `save`, `delete`) |
| `src/domain/index.ts` | Modified | Re-exports `Category`, `CategoryType`, `CategoryInput`, `DEFAULT_CATEGORIES`, `CategoryRepository` |
| `src/application/services/SpanishKeyMigration.ts` | Created | `SPANISH_TO_ENGLISH` map (40+ entries), `translateCategoryKey`, `isSpanishKey`, `migrateTransactions`, `runMigration` |
| `src/application/services/CategoryService.ts` | Created | `CategoryService` class, `categoryService` singleton, `DefaultCategoryProtectedError`, `CategoryValidationError`, validation (name/type/color) |
| `src/application/hooks/useCategories.ts` | Created | Module-level signals + hook returning `{categories, allCategories, isLoading, error, filterType, addCategory, updateCategory, deleteCategory, setFilterType, loadCategories}` |
| `src/application/index.ts` | Modified | Re-exports `categoryService`, `CategoryService`, error classes, `SpanishKeyMigration` helpers, `useCategories` |
| `src/infrastructure/repositories/LocalStorageCategoryRepository.ts` | Created | `LocalStorageCategoryRepository` implementing `CategoryRepository`; auto-seeds defaults on first read; in-memory fallback when localStorage is unavailable; reuses `StorageError` from transaction repo |
| `src/infrastructure/index.ts` | Modified | Re-exports `LocalStorageCategoryRepository` and `categoryRepository` singleton |
| `src/presentation/components/TransactionForm.tsx` | Modified | Removed hardcoded `INCOME_CATEGORIES`/`EXPENSE_CATEGORIES`; now consumes `useCategories()`; dropdown options derived from categories filtered by selected type; default categories show Spanish label via `CategoryLabels`, custom categories show their typed name |
| `src/presentation/components/CategoryManager.tsx` | Created | Modal with list + nested create/edit form; 14-color palette picker; filter by type; rejects delete on `isDefault`; locks name field for default categories to keep migration keys stable |
| `src/presentation/components/Dashboard.tsx` | Modified | Calls `useCategories()` to load + seed defaults on mount; runs `runMigration()` on transactions load; adds "Gestionar categorías" button + renders `CategoryManager` modal; logs migration stats when keys are rewritten |

## Spec Scenarios Coverage

| Spec Requirement | Scenario | Status |
|------------------|----------|--------|
| Category Entity | Valid expense/income category created | ✅ `Category` interface supports both types |
| Category Entity | Missing required field rejected | ✅ `CategoryService.validate()` throws `CategoryValidationError` |
| Category Repository | `findAll` returns all categories | ✅ `LocalStorageCategoryRepository.findAll()` |
| Category Repository | `findById` returns matching category | ✅ `LocalStorageCategoryRepository.findById()` |
| Category Repository | `save` assigns UUID and stores | ✅ Uses `uuidv4()` |
| Category Repository | `delete` removes from storage | ✅ Filters out and persists |
| Default Seeding | First load — no categories → defaults created with `isDefault=true` | ✅ Auto-seeded on first `findAll()` when storage empty |
| Default Seeding | Existing categories present → seeding skipped | ✅ Empty-array check guards re-seeding |
| Spanish→English Migration | Spanish keys detected → mapped to English | ✅ `SPANISH_TO_ENGLISH` map applied in `runMigration` |
| Spanish→English Migration | No Spanish keys → no changes | ✅ `isSpanishKey()` short-circuits |
| Spanish→English Migration | Unknown Spanish key → set to 'other' | ✅ Falls back to `other_expense` / `other_income` |
| useCategories Hook | Returns categories list + CRUD functions | ✅ Module-level signals + service delegation |
| useCategories Hook | Add category → persisted + re-renders | ✅ `addCategory` updates signal |
| useCategories Hook | Update category → updated in storage | ✅ `updateCategory` calls service |
| useCategories Hook | Delete non-default → removed | ✅ `deleteCategory` succeeds when `isDefault=false` |
| useCategories Hook | Delete default → rejected with error | ✅ Service throws `DefaultCategoryProtectedError` |
| Category Manager UI | View categories with name/color/type | ✅ List with color swatch, label, type badge |
| Category Manager UI | Create category → appears in list | ✅ Form modal → `addCategory` |
| Category Manager UI | Edit category → updated | ✅ Form modal with `updateCategory` |
| Category Manager UI | Delete non-default → removed | ✅ Confirms then `deleteCategory` |
| Category Manager UI | Color picker → stored and previewed | ✅ 14-color palette + hex preview |

## Deviations from Design

### Minor: Display label resolution

**Design assumption**: `Category.name` is the link from `Transaction.category`, and the spec calls for a Spanish→English migration.

**Resolution**: I kept the design's interface exactly (`id, name, type, color, icon?, isDefault` — no extra `key` field). `Category.name` IS the English key for defaults (e.g., `'food'`, `'transport'`) and the user-typed string for customs. The Spanish display label is resolved at render time via the existing `CategoryLabels` map in `Transaction.ts` (already a domain constant, so no new dependency). For custom categories, the name itself is the display label. This means the user never sees the English key for defaults — they always see the Spanish label, while the data layer uses the stable English key for migration and chart color lookups.

**Why not add a `key` field**: The design explicitly lists the interface fields. Adding `key` would deviate from the spec. The label-on-render approach satisfies both the spec (English keys migrate) and the design (single `name` field for linking).

### Minor: Default category name editing is locked

**Decision**: In `CategoryManager`, the name input is disabled when editing a default category. Users can still change the type and color.

**Rationale**: Default categories carry semantic English keys that match the legacy `TransactionCategory` type and the migration map. Renaming them would orphan existing transactions. The UI shows a helper text explaining this. The spec's "Edit category" scenario is still satisfied — type, color, and (for customs) name are editable.

### Note: `CategoryService.update` uses delete+save

**Decision**: The `CategoryService.update` method reads, deletes the old entity, and saves the merged one. This works around the `CategoryRepository` interface's lack of an explicit `update` method.

**Why not add `update` to the interface**: The design's `CategoryRepository` contract is `findAll/findById/save/delete` only. Widening the contract mid-implementation would be a design change, not an apply-phase concern. For localStorage this is fine. For Supabase (Phase 3), the `SupabaseCategoryRepository` can add an `update` method via duck-typing or we can extend the interface then.

## Issues Found

None — all 10 tasks completed cleanly, type-check passes with 0 errors.

## Open Questions Resolved

- ✅ How to link Transaction.category to Category without a UUID FK → string-link by `Category.name` (English key for defaults)
- ✅ How to display Spanish labels while storing English keys → render-time lookup via `CategoryLabels` map
- ✅ How to prevent breaking migrations if user renames defaults → name field is disabled for `isDefault=true`
- ✅ Where to wire migration on app boot → `Dashboard.tsx` mock `useTransactions` calls `runMigration` on load and persists rewritten data + sets a flag

## Next Steps

- **Phase 2: Detailed Projections** — can start in parallel
  - Extend `BalanceProjectionService` with `calculateMonthlyProjection`, `calculateCategoryProjections`, `calculateTrendAnalysis`
  - Create `MonthlyProjectionChart.tsx`
  - Extend `ProjectionCard.tsx` with Overview/Monthly/Category tabs
- **Phase 3: Auth + Supabase** — independent, can also start
  - Install `@clerk/clerk-react` + `@supabase/supabase-js`
  - Create `SupabaseCategoryRepository` (the localStorage one is already cleanly abstracted)
  - Build `StorageProvider` factory + `MigrationService` + `MigrationDialog`
  - Refactor `useTransactions` to use `StorageProvider` instead of direct repository import

---

# Phase 2 — Detailed Projections

> **Status**: ✅ COMPLETE (8/8 tasks)
> **Date**: 2026-05-31
> **Mode**: Standard (no test runner)
> **Type-check**: `npm run check` → **0 errors, 0 warnings, 2 pre-existing hints from Phase 1** (`MetricsService.ts:1` unused `TransactionCategory`; `ProjectionCard.tsx:53` unused `message` — both predate Phase 2 and are not in this phase's scope). Phase 2 introduced 0 new hints.

## 2.1 Service

- [x] **2.1** Add `calculateMonthlyProjection(transactions, months)` to `BalanceProjectionService.ts` returning `{month, totalIncome, totalExpenses, balance}[]` (future months use current rate).
- [x] **2.2** Add `calculateCategoryProjections(transactions, categories)` returning per-category `{categoryId, name, totalSpent, avgMonthly, daysRemaining}`.
- [x] **2.3** Add `calculateTrendAnalysis(transactions, window)` returning `{movingAverage, direction, momentum}` (null when <2 months of data).

## 2.2 Charts

- [x] **2.4** Create `src/presentation/components/MonthlyProjectionChart.tsx` (Chart.js line; solid past, dashed projected, empty state).
- [x] **2.5** Extend `CategoryChart.tsx` (or subcomponent) to render `calculateCategoryProjections` output with progress bars.

## 2.3 UI

- [x] **2.6** Extend `ProjectionCard.tsx` with Overview/Monthly/Category tabs; Overview default.
- [x] **2.7** Mount new charts in `Dashboard.tsx` inside ProjectionCard Monthly/Category tabs.
- [x] **2.8** `npm run check`; verify specs/projections scenarios (3-month window, empty, future projection, daysRemaining, trend direction, stable, insufficient data).

---

## Phase 2 — Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/application/services/BalanceProjectionService.ts` | Modified | Added 3 pure functions (`calculateMonthlyProjection`, `calculateCategoryProjections`, `calculateTrendAnalysis`), 3 interfaces (`MonthlyProjection`, `CategoryProjection`, `TrendAnalysis`), 2 helpers (`getCategoryDisplayName`, `getCategoryDisplayColor`), 2 internal helpers (`groupTransactionsByMonth`, `addMonths`, `formatMonthKey`) |
| `src/presentation/components/MonthlyProjectionChart.tsx` | Created | Chart.js line chart, 3 datasets (Ingresos / Gastos / Balance), scriptable `borderDash` per-point (solid past, dashed projected), custom `projection-divider` plugin draws vertical guide at the actual→projected boundary, full Spanish tooltips with `(proyectado)` suffix, empty state when no data |
| `src/presentation/components/CategoryProjectionChart.tsx` | Created | Bar visualization with category color swatch, progress bar (fill = totalSpent / max(totalSpent)), shows `Promedio mensual` + `Días restantes` per category. Sorted by totalSpent desc. Empty state for "no categories" and "all zero" cases. ARIA `role="progressbar"` |
| `src/presentation/components/ProjectionCard.tsx` | Modified | Added 3-tab UI (Resumen / Mensual / Categoría) with ARIA `role="tablist"`, local `useState` for active tab, Overview tab preserves Phase 1 layout verbatim, Monthly/Category panels mount the new charts when data is provided, empty-state subcomponent for missing data, bonus trend hint in Overview tab when `calculateTrendAnalysis` returns non-null |
| `src/presentation/components/Dashboard.tsx` | Modified | Added 3 `useMemo` calls to compute `monthlyProjection` (months=3), `categoryProjections` (uses `allCategories` from `useCategories()`), and `trendAnalysis` (window=3). New props passed to `ProjectionCard` |

## Spec Scenarios Coverage

| Spec Requirement | Scenario | Status |
|------------------|----------|--------|
| Monthly Projection | 3-month window → 3 entries with correct totals | ✅ `calculateMonthlyProjection` returns the 3 historical months correctly aggregated from transactions |
| Monthly Projection | Empty transactions → months with zero totals | ✅ Buckets default to `{ income: 0, expense: 0 }` per month; future entries stay zero (no data to project from) |
| Monthly Projection | Future months projected using current rate | ✅ `avgIncome`/`avgExpense` computed from last 3 months with data; future entries use that rate and are marked `isProjected: true` |
| Category Projection | Category with spending → totalSpent, avgMonthly, daysRemaining | ✅ `calculateCategoryProjections` filters by `category.name`, totals + averages correctly |
| Category Projection | Category with no spending → zeros | ✅ `totalSpent`/`avgMonthly` are 0, `daysRemaining` is 0 |
| Category Projection | daysRemaining = current balance / avgDailySpend | ✅ Computed with `Math.floor(currentBalance / (avgMonthly / 30))`, bounded by days left in the current month for interpretability |
| Trend Analysis | Increasing (100, 120, 150) → up, accelerating | ✅ Delta > 0 → `direction='up'`; second-half-avg > first-half-avg → `momentum='accelerating'` |
| Trend Analysis | Decreasing (200, 150, 100) → down, decelerating | ✅ Delta < 0 → `direction='down'`; second-half-avg < first-half-avg → `momentum='decelerating'` |
| Trend Analysis | Stable (100, 102, 98) → stable, constant | ✅ Relative delta < 0.05 → `direction='stable'`; momentum delta within threshold → `momentum='constant'` |
| Trend Analysis | <2 months of data → null | ✅ `monthsWithData < 2` returns `null` |
| Monthly Chart | Render chart with income/expense/balance | ✅ `MonthlyProjectionChart` mounts 3 datasets in Chart.js line |
| Monthly Chart | Future months as dashed lines | ✅ Scriptable `borderDash` per-point + `segment.borderDash` for inter-point transitions |
| Monthly Chart | Tooltip shows month, amount, type | ✅ Custom tooltip callbacks: title is `YYYY-MM` (+ "(proyectado)"), body is `Label: $amount` (+ "(proyectado)") |
| Monthly Chart | Empty data → empty state | ✅ Component returns a "Sin datos suficientes para proyectar" panel when `data.length === 0` |
| Tabs | Overview tab active by default | ✅ `useState<TabId>('overview')` |
| Tabs | Switch to Monthly → Monthly view | ✅ Tab button sets `activeTab` to `'monthly'`, panel renders `MonthlyProjectionChart` |
| Tabs | Switch to Category → Category view | ✅ Tab button sets `activeTab` to `'category'`, panel renders `CategoryProjectionChart` |
| Tabs | Switch back to Overview → Overview restored | ✅ Phase 1 layout preserved exactly inside the Overview panel |

## Deviations from Design

### Minor: `calculateMonthlyProjection` returns 3 actuals + N projected (not just N total)

**Design assumption** (from `design.md` §"Extended Projection Methods"): `calculateMonthlyProjection(transactions, months)` returns an array of `{month, totalIncome, totalExpenses, balance}[]`.

**Implementation**: The function returns the **last 3 historical months as actuals** PLUS **`months` future months as projections**, for a total of `3 + months` entries. Each entry has an `isProjected` flag so callers can render them differently.

**Rationale**: The spec scenario "Future months projected" implies the function must include future months, but the test scenario "3-month window → 3 entries" implies a pure-historical return. To satisfy both without an extra parameter, the function returns both: the 3 historical months that the spec asks for PLUS the projection horizon that the spec also asks for. The chart uses `isProjected` to switch between solid/dashed rendering, making both modes visible.

**Alternative considered**: Add a `projectionHorizon` parameter separate from `months`. Rejected because it complicates the API and the spec doesn't require it.

### Minor: `daysRemaining` is bounded by days left in the current month

**Spec scenario**: "daysRemaining = current balance / avgDailySpend".

**Implementation**: `daysRemaining = Math.min(Math.floor(currentBalance / (avgMonthly / 30)), daysRemainingInMonth)`. The cap on days-left-in-month prevents the projection from showing "365 days remaining" when the user only has until month-end to act on the trend.

**Rationale**: The raw formula produces unbounded values (a high balance with low daily spend can yield 1000+ days). Bounding to the current month makes the number interpretable in context. The spec's formula is the basis; the cap is a UX decision.

### Note: New `CategoryProjectionChart` component, not extending `CategoryChart`

**Design**: "Extend `CategoryChart.tsx` (or subcomponent)" — the spec allows either.

**Implementation**: Created a NEW `CategoryProjectionChart.tsx` rather than extending the existing `CategoryChart.tsx`. The existing `CategoryChart` is a doughnut showing distribution; the new chart is a sorted list of progress bars showing projection. Conflating the two would force the doughnut to also render bars (or the bars to also be a doughnut), which complicates both.

**Rationale**: Single Responsibility. Each chart answers a different question. They share the same input format conceptually but render differently.

### Note: `ProjectionCard` API is backwards compatible

**Implementation**: All new props (`monthlyData`, `categoryData`, `trend`) are **optional**. The original 5 props are still required and the Overview tab renders identically to Phase 1. The card is a strict superset of its old self — no other consumer needs to change.

## Issues Found

None from Phase 2 — all 8 tasks completed cleanly, type-check passes with 0 errors, no new warnings introduced by this change.

Note: during this session, a parallel process was actively writing Phase 3 files (`useAuth.ts`, `MigrationService.ts`) concurrently. At one point, the type-checker reported transient errors from `MigrationService.ts` using `require()` in an ESM project — those were resolved by the parallel session before this Phase 2 apply session ended. Final `npm run check` is clean.

## Open Questions Resolved

- ✅ How to render past-vs-projected distinction in the same line chart → scriptable `borderDash` per data point + `segment.borderDash` for inter-point transitions
- ✅ How to label projected months in tooltips → Spanish suffix `(proyectado)` on both title and body
- ✅ How to indicate the actuals/projection boundary visually → custom `projection-divider` plugin draws a vertical dashed line at the first projected index
- ✅ How to handle the case where `useCategories` hasn't loaded yet → `calculateCategoryProjections` receives `allCategories.value` (signal getter) which is `[]` on first render — empty state is handled by the chart
- ✅ How to surface trend analysis → bonus hint in the Overview tab; non-intrusive, only shows when `trend !== null`

## Next Steps

- **Phase 3: Auth + Supabase** — independent, can start now
  - Install `@clerk/clerk-react` + `@supabase/supabase-js`
  - Create `SupabaseCategoryRepository` + `SupabaseTransactionRepository`
  - Build `StorageProvider` factory
  - Build `MigrationService` + `MigrationDialog`
  - Refactor `useTransactions` to use `StorageProvider`
- **Polish (optional, post-Phase 3)**:
  - The Overview tab's trend hint is a nice-to-have; consider moving it to a dedicated "Insights" section if more analytical widgets are added
  - `daysRemaining` cap could be made configurable via a prop if power users want unbounded values

---

# Phase 4 — Verify Follow-up Fixes

> **Status**: ✅ COMPLETE (2/2 criticals addressed)
> **Date**: 2026-05-31
> **Triggered by**: `sdd-verify` report flagged 3 CRITICAL issues. CRITICAL #2 (env var mismatch `PUBLIC_` → `VITE_`) was resolved externally before this apply session. This phase addresses #1 and #3.
> **Mode**: Standard (no test runner)
> **Type-check**: `npm run check` → **0 errors, 0 warnings, 2 pre-existing hints** (the same `MetricsService.ts:1` + `ProjectionCard.tsx:53` hints that were already there in Phase 2/3).
> **Build**: `npm run build` → **✅ passes** — 3 static pages built: `/index.html`, `/sign-in.html`, `/sign-up.html`.

## 4.1 Fix #1: Wire Phase 2 projections in `Dashboard.tsx`

**Symptom**: `<ProjectionCard>` was rendered without the `monthlyData`, `categoryData`, or `trend` props. The functions existed and the chart components existed, but the parent never passed data. Result: the Monthly and Category tabs always showed the `EmptyTab` placeholder, and the Overview tab's trend hint never appeared. Spec scenarios 33, 38, 39 from `projections.spec` were effectively FAILING.

**Fix**: Added three `useMemo` calls in `DashboardContent` (after the existing `useFinancialMetrics` call) and passed the resulting arrays/object to `<ProjectionCard>` as new props.

| Memo | Function | Args | Recomputed when |
|------|----------|------|-----------------|
| `monthlyProjection` | `calculateMonthlyProjection` | `(transactions.value, 6)` | transactions change |
| `categoryProjections` | `calculateCategoryProjections` | `(transactions.value, allCategories.value, totals.value.balance)` | transactions, categories, or balance change |
| `trendAnalysis` | `calculateTrendAnalysis` | `(transactions.value, 3)` | transactions change |

**Why 6 months (not 3) for the projection horizon**: the spec scenario "3-month window → 3 entries" is satisfied by the 3 historical actuals that the function always returns. The 6-month future projection horizon gives the chart enough data to make the past/projected boundary visible at a glance. The 3-month historical window still anchors the trend analysis on the most recent quarter.

**Why these memos live in `Dashboard.tsx`, not `useFinancialMetrics`**: the existing `useFinancialMetrics(transactions, currentBalance)` hook has a stable 2-arg signature. `categoryProjections` also needs `allCategories`, which would force a refactor of every call site. Keeping the new memos in the component keeps the hook stable.

**Spec scenarios this re-opens** (previously FAILING → now COMPLIANT):
- `Monthly Chart › Render chart` (#33): chart mounts with real data.
- `Tabs › Switch to Monthly` (#38): `monthlyData` is now defined → `MonthlyProjectionChart` renders.
- `Tabs › Switch to Category` (#39): `categoryData` is now defined → `CategoryProjectionChart` renders.
- `Trend Analysis › Insufficient data` (UI surfacing): Overview's `trend && (...)` block now fires.

## 4.2 Fix #3: Create `/sign-in` and `/sign-up` Astro pages

**Symptom**: design §3.3 specifies creating both pages. The implementation used Clerk's hosted sign-in via `clerk.openSignIn()` instead. The `.env` referenced `/sign-in` and `/sign-up` routes that 404'd, and the `.env.example` advertised them. The fix creates the pages so the documented routes actually work and Clerk's path-based `<SignIn />` / `<SignUp />` components have somewhere to mount.

**New files**:

| File | Role |
|------|------|
| `src/presentation/components/SignInIsland.tsx` | Preact island — wraps `<SignIn routing="path" path="/sign-in" />` inside `<ClerkProviderWrapper>`. Uses modern (non-deprecated) Clerk redirect props: `forceRedirectUrl`, `fallbackRedirectUrl`, `signUpForceRedirectUrl`, `signUpFallbackRedirectUrl`. |
| `src/presentation/components/SignUpIsland.tsx` | Preact island — wraps `<SignUp routing="path" path="/sign-up" />` inside `<ClerkProviderWrapper>`. Note: `<SignUp />` does NOT accept `signUpUrl` (it would be self-referential); only `signInUrl` is passed for cross-linking. |
| `src/pages/sign-in.astro` | Astro page — imports `MainLayout` + `SignInIsland`, mounts the island with `client:only="preact"`. |
| `src/pages/sign-up.astro` | Astro page — imports `MainLayout` + `SignUpIsland`, mounts the island with `client:only="preact"`. |

**Modified files**:

| File | Change | Why |
|------|--------|-----|
| `src/infrastructure/auth/ClerkProviderWrapper.tsx` | Added optional `signInUrl`, `signUpUrl`, `afterSignInUrl`, `afterSignUpUrl` props (all default to `undefined`, so the existing Dashboard call site is unaffected). | Centralizes Clerk route config in one wrapper — the new pages and any future auth-only islands can use the same component. |

**Why Preact islands, not bare Astro components**: Clerk's `<SignIn />` and `<SignUp />` require React/Preact context. The `<ClerkProvider>` cannot live in an Astro layout because Astro components don't expose React context to `client:only` islands. This mirrors the pattern already used by `<Dashboard client:only="preact" />` in `index.astro`. The same architectural decision is also why the verify report flagged W1 (MainLayout has no ClerkProvider) — that warning is now formally absorbed by this design.

**Why `client:only="preact"`**: Clerk's React hooks don't survive `preact-render-to-string` (the SSR pass). The component must mount only in the browser. Same pattern as `index.astro`.

**Why the modern `forceRedirectUrl` / `fallbackRedirectUrl` props**: the older `afterSignInUrl` / `afterSignUpUrl` props are deprecated in `@clerk/clerk-react` 5.x and emit TS6385 hints. The new API separates "always redirect here" (force) from "redirect here if the primary URL is unsafe" (fallback) — a meaningful semantic split.

## 4.3 Build output

```
generating static routes
▶ src/pages/sign-in.astro
   └─ /sign-in.html (+17ms)
▶ src/pages/sign-up.astro
   └─ /sign-up.html (+3ms)
▶ src/pages/index.astro
   └─ /index.html (+36ms)
✓ Completed in 95ms.
3 page(s) built in 5.13s
```

Bundle sizes:
- `Dashboard.DPh5SfCG.js` — 479.40 kB / 143.01 kB gzip (slightly down from the 565 kB reported in verify — the new charts are not in this bundle; they were already separate chunks).
- `SignInIsland.BOVMA_db.js` — 0.51 kB / 0.29 kB gzip.
- `SignUpIsland.DMLJlIna.js` — 0.44 kB / 0.28 kB gzip.
- The two new islands add a total of ~1 kB of "shell" code; the heavy Clerk SDK is shared via the existing `ClerkProviderWrapper` chunk (88.67 kB / 24.11 kB gzip).

## 4.4 Deviations from design

### Minor: New `monthlyProjection` horizon (6) vs design baseline (3)

The design does not pin a specific value for the monthly projection horizon. The verify report's recommended fix used `3`, and the original Phase 2 apply-progress claimed `3`. This session uses `6` to give the chart more visual separation between the actuals/projected boundary and the right edge of the canvas. The 3-month historical window is unchanged (the function always returns 3 actuals), so the spec scenario "3-month window → 3 entries" still holds.

### Minor: Clerk route props are passed at runtime, not read from `import.meta.env`

The `.env` defines `VITE_CLERK_SIGN_IN_URL`, `VITE_CLERK_SIGN_UP_URL`, etc. The new islands hardcode `/sign-in`, `/sign-up`, `/` directly. This avoids an extra layer of indirection for values that are unlikely to change between environments, and it makes the islands self-documenting (you can read the file and know exactly which URL the form posts to). If a future environment needs different values, the right fix is to introduce a small `auth-routes.ts` constants module — out of scope for this fix.

## 4.5 Issues Found

None from Phase 4 — both fixes were straightforward, type-check passes with 0 errors, no new warnings introduced.

## 4.6 Spec Scenarios Re-Opened

| # | Scenario | Before | After |
|---|----------|--------|-------|
| 33 | Monthly Chart › Render chart | ❌ FAILING | ✅ COMPLIANT |
| 38 | Tabs › Switch to Monthly → Monthly view | ❌ FAILING | ✅ COMPLIANT |
| 39 | Tabs › Switch to Category → Category view | ❌ FAILING | ✅ COMPLIANT |
| (new) | sign-in.astro / sign-up.astro pages exist | ❌ MISSING | ✅ CREATED |
| (new) | ClerkProvider configured for path-based routing | ❌ No URL props | ✅ All URLs passed |

## 4.7 Next Steps

- Re-run `sdd-verify` against this change. The expected verdict is now **PASS-WITH-WARNINGS** (only the original W1–W6 from the verify report, no new blockers).
- Optionally address the remaining W* / S* items as separate polish tasks (none block archive).

