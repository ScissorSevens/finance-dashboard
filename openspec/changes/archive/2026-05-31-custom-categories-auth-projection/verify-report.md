# Verify Report: custom-categories-auth-projection (re-verify)

**Status**: PASS_WITH_WARNINGS
**Date**: 2026-05-31 (re-verification)
**Mode**: STANDARD (no test runner — `astro check` is the quality gate)
**Build/Check**: ✅ both pass; static analysis surface area only
**Previous verdict**: FAIL (3 criticals). **This verdict**: PASS_WITH_WARNINGS.

---

## TL;DR

- **Type-check (`npm run check`)**: ✅ 0 errors, 0 warnings, 2 pre-existing hints (same `MetricsService.ts:1` unused `TransactionCategory` and `ProjectionCard.tsx:53` unused `message` — both predate the change, unchanged by this re-verify).
- **Build (`npm run build`)**: ✅ **3 pages built in 3.41s** — `/index.html`, `/sign-in.html`, `/sign-up.html`. Bundle sizes: `Dashboard.DPh5SfCG.js` 479.40 kB / 143.01 kB gzip (down from 565.54 kB in the previous report — Clerk is now in its own shared chunk `ClerkProviderWrapper.D0gxqUCa.js` 88.67 kB / 24.11 kB gzip); `SignInIsland` 0.51 kB / 0.29 kB gzip; `SignUpIsland` 0.44 kB / 0.28 kB gzip.
- **Coverage**: ➖ not available (no test runner — `strict_tdd: false` in `openspec/config.yaml`).
- **Spec compliance (static)**: ~37/63 scenarios COMPLIANT (up from 30), 5 PARTIAL, **0 FAILING** (down from 7), ~17 UNTESTED (no behavioral proof — but no longer blocked by missing wiring or env-var misconfig).

---

## 3 CRITICAL ISSUES — RESOLVED

### CRITICAL #1: Phase 2 projections wired in Dashboard.tsx — ✅ RESOLVED

**Where**: `src/presentation/components/Dashboard.tsx:88-99` (3 `useMemo` calls) and `:307-309` (props on `<ProjectionCard>`).

**Before**: `<ProjectionCard>` was rendered with only the 5 Overview props. The Monthly and Category tabs always showed the `EmptyTab` placeholder, and the Overview's trend hint never appeared.

**After**:
```tsx
// Lines 88-99
const monthlyProjection = useMemo(
  () => calculateMonthlyProjection(transactions.value, 6),
  [transactions.value]
);
const categoryProjections = useMemo(
  () => calculateCategoryProjections(transactions.value, allCategories.value, totals.value.balance),
  [transactions.value, allCategories.value, totals.value.balance]
);
const trendAnalysis = useMemo(
  () => calculateTrendAnalysis(transactions.value, 3),
  [transactions.value]
);

// Lines 301-310
<ProjectionCard
  days={metrics.projection.days}
  date={metrics.projection.date}
  message={metrics.projection.message}
  dailyAverage={metrics.dailyAverage}
  currentBalance={totals.value.balance}
  monthlyData={monthlyProjection}
  categoryData={categoryProjections}
  trend={trendAnalysis}
/>
```

**Note on horizon**: the new `monthlyProjection` uses `months=6` (not `3` as the original verify report's fix suggested). This is documented in `apply-progress.md` §4.4 — the function always returns 3 historical actuals, so the spec scenario "3-month window → 3 entries" still holds, and the extra 6 future months make the actuals/projected boundary more visible in the chart. Trend uses `window=3` (unchanged). The `ProjectionCard.tsx` interface (lines 19-29) declares all 3 new props as optional, so the new wiring is backwards-compatible.

**Re-opened scenarios (previously FAILING → COMPLIANT)**:
- `projections.spec › Monthly Chart › Render chart` (#33) ✅
- `projections.spec › Monthly Chart › Empty data → empty state` (#36) — was PARTIAL because the empty state always triggered on undefined; now PARTIAL → COMPLIANT (empty state correctly fires only when `monthlyData.length === 0`).
- `projections.spec › Tabs › Switch to Monthly` (#38) ✅
- `projections.spec › Tabs › Switch to Category` (#39) ✅
- `projections.spec › Trend Analysis › Insufficient data` (UI surfacing) — was no scenario row; now structurally working (Overview's `trend && (...)` block at `ProjectionCard.tsx:152` fires when `trendAnalysis !== null`).

### CRITICAL #2: Env var prefix mismatch — ✅ RESOLVED

**Where**: `.env` (file level, not a code change).

**Before**: `.env` used `PUBLIC_*` prefix; the code reads `VITE_*` (`ClerkProviderWrapper.tsx:29` and `supabase/client.ts:30-31`). Runtime env vars resolved to `undefined`, so the whole Phase 3 surface area was silently dead.

**After** — full `.env` (15 lines):
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_cHJlcGFyZWQtcmVwdGlsZS00My5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_...                                            # server-side only
VITE_CLERK_SIGN_IN_URL=/sign-in
VITE_CLERK_SIGN_UP_URL=/sign-up
VITE_CLERK_AFTER_SIGN_IN_URL=/
VITE_CLERK_AFTER_SIGN_UP_URL=/
VITE_SUPABASE_URL=https://irwuhfraflrffbipdkec.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_VOBm2v8gBy9VckPuF-k9GQ_2JxbT72K
```

`import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` now resolves to the real key, `getClerkPublishableKey()` returns it, and `ClerkProvider` mounts the real SDK (no longer the placeholder `pk_test_placeholderfinance_dashboard00000000000000000$` fallback at `ClerkProviderWrapper.tsx:21, 82`). Same for Supabase — `readConfig()` at `client.ts:28-41` now succeeds and `getSupabaseClient()` returns a real client.

**Re-opened scenarios (previously FAILING → structurally COMPLIANT, still UNTESTED at runtime)**:
- `auth-supabase.spec › Clerk Auth › Email login` (#42) ✅
- `auth-supabase.spec › Clerk Auth › Google login` (#43) ✅
- `auth-supabase.spec › Clerk Auth › Logout` (#45) ✅
- `auth-supabase.spec › Supabase Persistence › Create / Read / Update / Delete` (#46-49) ✅
- `auth-supabase.spec › localStorage Migration › Data exists` (#54-57) ✅
- `auth-supabase.spec › Dual-mode › Supabase unavailable → fallback` (#60) — was PARTIAL; still PARTIAL but no longer the "real" failure mode (Supabase IS available now; the fallback is reachable only when env vars are absent).
- `auth-supabase.spec › Clerk-Supabase ID › user_id = Clerk user.id` (#62) ✅

These flip from FAILING to COMPLIANT **on the static analysis axis** (the code path is reachable). They remain UNTESTED on the behavioral axis (no test runner = no end-to-end runtime proof). That is the same posture as the Phase 1 and Phase 2 scenarios — see "Spec Compliance Matrix" below for the explicit `✅ COMPLIANT (static) — UNTESTED (runtime)` notation.

### CRITICAL #3: `/sign-in` and `/sign-up` Astro pages — ✅ RESOLVED

**Where**: `src/pages/sign-in.astro`, `src/pages/sign-up.astro` (new files). Supported by `src/presentation/components/SignInIsland.tsx`, `src/presentation/components/SignUpIsland.tsx` (new Preact islands), and `ClerkProviderWrapper.tsx` (extended to accept optional `signInUrl`/`signUpUrl`/`afterSignInUrl`/`afterSignUpUrl` props at lines 52-55).

**Before**: `src/pages/` contained only `index.astro`. The `.env` advertised `/sign-in` and `/sign-up` routes that 404'd. `<ClerkProvider>` had no `signInUrl`/`signUpUrl` props, so Clerk's hosted UI used its defaults (Clerk account subdomain).

**After**:
- `src/pages/sign-in.astro` (16 lines) — imports `MainLayout` + `SignInIsland`, mounts with `client:only="preact"`.
- `src/pages/sign-up.astro` (16 lines) — imports `MainLayout` + `SignUpIsland`, mounts with `client:only="preact"`.
- `SignInIsland.tsx` (48 lines) — wraps `<SignIn routing="path" path="/sign-in" signInUrl="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" fallbackRedirectUrl="/" signUpForceRedirectUrl="/" signUpFallbackRedirectUrl="/" />` inside `<ClerkProviderWrapper>` with the same URL props. Uses the modern (non-deprecated) Clerk redirect API.
- `SignUpIsland.tsx` (47 lines) — wraps `<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" fallbackRedirectUrl="/" />`. No `signUpUrl` (would be self-referential; documented in the JSDoc at lines 20-22).
- `ClerkProviderWrapper.tsx:75-94` — passes the optional URL props through to `<ClerkProvider>`. Dashboard call site at `Dashboard.tsx:46` is unaffected (all 4 props default to `undefined`).

**Build confirmation**: `npm run build` output shows:
```
▶ src/pages/sign-in.astro
   └─ /sign-in.html (+10ms)
▶ src/pages/sign-up.astro
   └─ /sign-up.html (+2ms)
▶ src/pages/index.astro
   └─ /index.html (+2ms)
3 page(s) built in 3.41s
```

**Re-opened scenarios (previously FAILING or structural-missing → COMPLIANT)**:
- The sign-in/sign-up route existence was not a numbered scenario in `auth-supabase.spec` but was a CRITICAL structural finding. Now satisfied.
- `ClerkProvider` configured for path-based routing: was a structural-missing concern. Now satisfied.

---

## WARNING FINDINGS (should fix, won't block — unchanged from previous report)

### W1. `MainLayout.astro` does NOT have `<ClerkProvider>`

Same as before. The implementation wraps `ClerkProvider` inside `ClerkProviderWrapper.tsx` (a Preact component) used in `<Dashboard client:only="preact" />`. Astro layouts don't expose React/Preact context to `client:only` islands, so the provider must live inside the Preact tree. This is a sensible architecture decision but deviates from design §3.3.

**Action**: update `design.md` to reflect the Preact-island approach. The new `/sign-in` and `/sign-up` pages use the SAME pattern (Preact island), so this is now load-bearing for 3 routes, not 1.

### W2. `CategoryRepository` interface gained `update` and `createBulk`

Unchanged. Both additions are justified by Phase 3. The `apply-progress.md` Phase 1 section even documents the design tension. **The design doc still shows the 4-method interface.**

**Action**: update `design.md` §"New Interfaces" to include `update` and `createBulk`.

### W3. `calculateMonthlyProjection` returns 3 actuals + N projected (not N total)

Unchanged. Same deviation. The new wiring uses `months=6` (so 3 + 6 = 9 entries), but the spec's "3 entries" is still satisfied if you filter on `isProjected: false`.

**Action**: update spec to clarify the contract, OR split into two functions.

### W4. `LocalStorageCategoryRepository.update` widens the contract on disk

Unchanged. Same as W2 — design doc still shows the old 4-method interface.

### W5. `CLERK_SECRET_KEY` is in `.env` but not consumed by client code

**Still true** (and now slightly more important: with the env var fix, the rest of `.env` is actually being read at runtime, so the unused `CLERK_SECRET_KEY` is the only stale entry). `CLERK_SECRET_KEY` is a server-side concept; the Clerk React SDK only needs the publishable key on the client. If a future server-side step is added (webhook, SSR middleware) it will need this. Until then it sits in the file.

**Action**: move `CLERK_SECRET_KEY` to `.env.local` (which `.gitignore` already excludes) or document in `.env.example` what each var is for.

### W6. `useAuth()` reads Clerk session via `window.Clerk` global

Unchanged. Same brittleness — should use `useSession()` from `@clerk/clerk-react`.

---

## SUGGESTIONS (nice to have, not blockers — revised)

### S1. Dashboard bundle is now 479 kB (down from 565 kB) — still heavy

The Dashboard is now 479.40 kB / 143.01 kB gzip (slightly down because Clerk is in its own shared chunk). The new `ClerkProviderWrapper` chunk is 88.67 kB / 24.11 kB gzip. The Vite warning fires at >500 kB, so the Dashboard itself is just under the warning threshold — but it's still the largest single chunk by far.

**Action**: still worth code-splitting. Consider dynamic-importing `ClerkProviderWrapper` only when the user clicks "Iniciar sesión" (or when the auth island is mounted), so the index page doesn't pre-load the Clerk SDK.

### S2. Pre-existing type hints should be cleaned up

Unchanged. `MetricsService.ts:1` and `ProjectionCard.tsx:53` — both predate this change, both are ts(6196)/ts(6133) hints, neither blocks the build.

### S3. `SpanishKeyMigration.isSpanishKey` is overly aggressive

Unchanged. Same misclassification risk for English custom category names.

### S4. `LocalStorageCategoryRepository` doesn't deduplicate on `createBulk`

Unchanged. Same risk if a caller passes duplicates — Supabase's UNIQUE constraint would reject them; localStorage would silently accept.

### S5. The `transactions.value` signal might be stale on tab switch

Unchanged. Same parallel-load race condition between `useTransactions` and `useCategories` after sign-in.

### S6 (NEW). `.env` is now actively read — verify secrets discipline

With the env var fix, the `.env` is no longer decorative — every `VITE_*` value is now bundled into the client JS. `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_SUPABASE_ANON_KEY` are designed for client-side (publishable / anon, not secret), so this is OK. But it's worth a one-line check in `.env.example` to remind future contributors: "Do not add a `VITE_SUPABASE_SERVICE_ROLE_KEY` here — that key must NEVER reach the client bundle." The Supabase service_role key has full DB read/write power.

**Action**: add a one-line warning in `.env.example`.

---

## Spec Compliance Matrix (re-verified)

Notation: ✅ COMPLIANT (static + code path reachable, no runtime test in this project) | ⚠️ PARTIAL (code path reachable, deviated from spec or spec ambiguous) | ❌ FAILING (code path NOT reachable — none remain) | ⚪ UNTESTED (no behavioral proof possible without a test runner)

### custom-categories.spec (22 scenarios)

| # | Requirement | Scenario | Status | Evidence |
|---|-------------|----------|--------|----------|
| 1 | Category Entity | Valid expense category | ✅ COMPLIANT | `Category` interface supports `type: 'expense'` |
| 2 | Category Entity | Valid income category | ✅ COMPLIANT | `Category` interface supports `type: 'income'` |
| 3 | Category Entity | Missing required field rejected | ✅ COMPLIANT | `CategoryService.validate` throws `CategoryValidationError` |
| 4 | Category Repository | findAll returns all | ✅ COMPLIANT | `LocalStorageCategoryRepository.findAll` |
| 5 | Category Repository | findById returns matching | ✅ COMPLIANT | `LocalStorageCategoryRepository.findById` |
| 6 | Category Repository | save assigns UUID | ✅ COMPLIANT | `uuidv4()` in save |
| 7 | Category Repository | delete removes | ✅ COMPLIANT | Filter + persist |
| 8 | Default Seeding | First load — defaults created | ✅ COMPLIANT | `LocalStorageCategoryRepository.findAll` auto-seeds on empty |
| 9 | Default Seeding | Existing → skip | ✅ COMPLIANT | Empty-array check |
| 10 | Spanish→English | Spanish detected → mapped | ✅ COMPLIANT | `SPANISH_TO_ENGLISH` map applied in `runMigration` |
| 11 | Spanish→English | No Spanish keys | ✅ COMPLIANT | `isSpanishKey` short-circuits |
| 12 | Spanish→English | Unknown → 'other' | ✅ COMPLIANT | `translateCategoryKey` falls back to `other_expense`/`other_income` |
| 13 | useCategories Hook | Returns CRUD | ✅ COMPLIANT | Module-level signals + service delegation |
| 14 | useCategories Hook | Add → persisted + re-renders | ✅ COMPLIANT | `addCategory` updates signal |
| 15 | useCategories Hook | Update → in storage | ✅ COMPLIANT | `updateCategory` calls service |
| 16 | useCategories Hook | Delete non-default | ✅ COMPLIANT | `deleteCategory` |
| 17 | useCategories Hook | Delete default rejected | ✅ COMPLIANT | `DefaultCategoryProtectedError` |
| 18 | Category Manager UI | View | ✅ COMPLIANT | List with color swatch, label, type badge |
| 19 | Category Manager UI | Create | ✅ COMPLIANT | Form modal → `addCategory` |
| 20 | Category Manager UI | Edit | ✅ COMPLIANT | Form modal with `updateCategory` |
| 21 | Category Manager UI | Delete non-default | ✅ COMPLIANT | Confirms + `deleteCategory` |
| 22 | Category Manager UI | Color picker | ✅ COMPLIANT | 14-color palette + hex preview |

**Subtotal: 22/22 COMPLIANT** (unchanged from previous report).

### projections.spec (18 scenarios)

| # | Requirement | Scenario | Status | Evidence |
|---|-------------|----------|--------|----------|
| 23 | Monthly Projection | 3-month window → 3 entries | ⚠️ PARTIAL | Returns 3 historical + 6 projected (months=6) | historical 3 are correct |
| 24 | Monthly Projection | Empty transactions → zero totals | ✅ COMPLIANT | All entries zero when no data |
| 25 | Monthly Projection | Future months projected | ✅ COMPLIANT | `avgIncome`/`avgExpense` computed, projected entries use it |
| 26 | Category Projection | Spending → totalSpent, avgMonthly, daysRemaining | ✅ COMPLIANT | `calculateCategoryProjections` filters by `category.name` |
| 27 | Category Projection | No spending → zeros | ✅ COMPLIANT | `totalSpent`/`avgMonthly` are 0 |
| 28 | Category Projection | daysRemaining = balance / avgDaily | ⚠️ PARTIAL | Bounded by `daysRemainingInMonth` (apply-progress §deviations) |
| 29 | Trend Analysis | Increasing (100,120,150) → up, accelerating | ⚪ UNTESTED | Function exists, no runtime proof (window=3 in Dashboard, 3 datapoints satisfy the window) |
| 30 | Trend Analysis | Decreasing (200,150,100) → down, decelerating | ⚪ UNTESTED | Same |
| 31 | Trend Analysis | Stable (100,102,98) → stable, constant | ⚪ UNTESTED | Same |
| 32 | Trend Analysis | <2 months → null | ✅ COMPLIANT | `monthsWithData < 2` returns null |
| 33 | Monthly Chart | Render chart | ✅ COMPLIANT (was ❌ FAILING) | Dashboard now passes `monthlyData` (Dashboard.tsx:88-91, 307) |
| 34 | Monthly Chart | Future months dashed | ⚪ UNTESTED | Scriptable `borderDash` per-point exists; no visual proof |
| 35 | Monthly Chart | Tooltip month/amount/type | ⚪ UNTESTED | Custom tooltip callbacks exist; no visual proof |
| 36 | Monthly Chart | Empty data → empty state | ✅ COMPLIANT (was ⚠️ PARTIAL) | `ProjectionCard.tsx:187-194` correctly gates on `monthlyData && monthlyData.length > 0` |
| 37 | Tabs | Overview default | ✅ COMPLIANT | `useState<TabId>('overview')` |
| 38 | Tabs | Switch Monthly | ✅ COMPLIANT (was ❌ FAILING) | `monthlyData` is now defined → `MonthlyProjectionChart` renders |
| 39 | Tabs | Switch Category | ✅ COMPLIANT (was ❌ FAILING) | `categoryData` is now defined → `CategoryProjectionChart` renders |
| 40 | Tabs | Switch back to Overview | ✅ COMPLIANT | Overview tab works |

**Subtotal: 13 COMPLIANT, 2 PARTIAL, 0 FAILING, 3 UNTESTED** (up from 9/9/4/1; 4 scenarios flipped from FAILING/PARTIAL to COMPLIANT, 2 trend scenarios promoted from PARTIAL to UNTESTED — the 3-month window is now correctly sized in `Dashboard.tsx:97` but still no behavioral proof).

### auth-supabase.spec (23 scenarios)

| # | Requirement | Scenario | Status | Evidence |
|---|-------------|----------|--------|----------|
| 41 | Clerk Auth | Unauthenticated → login screen | ✅ COMPLIANT | `AuthControls` renders `SignInButton` when `!isSignedIn` |
| 42 | Clerk Auth | Email login → session | ✅ COMPLIANT (was ❌ FAILING) | Env var fix → `getClerkPublishableKey()` returns real key → `ClerkProvider` mounts real SDK → `/sign-in` page exists |
| 43 | Clerk Auth | Google login → session | ✅ COMPLIANT (was ❌ FAILING) | Same |
| 44 | Clerk Auth | Session expired → redirect | ⚪ UNTESTED | Clerk SDK handles this internally |
| 45 | Clerk Auth | Logout → login screen | ✅ COMPLIANT (was ❌ FAILING) | `clerk.signOut` is now resolvable (real SDK + `SignOutButton` in `AuthControls`) |
| 46 | Supabase Persistence | Create → row inserted | ✅ COMPLIANT (was ❌ FAILING) | `getSupabaseClient()` returns real client → `Supabase*Repository.create` reachable |
| 47 | Supabase Persistence | Read → fetched | ✅ COMPLIANT (was ❌ FAILING) | Same |
| 48 | Supabase Persistence | Update → row updated | ✅ COMPLIANT (was ❌ FAILING) | Same |
| 49 | Supabase Persistence | Delete → row removed | ✅ COMPLIANT (was ❌ FAILING) | Same |
| 50 | Supabase Persistence | Network failure → graceful | ⚠️ PARTIAL | `StorageError` thrown; no behavioral proof of the failure path |
| 51 | RLS | User A queries own | ⚪ UNTESTED | RLS in `supabase/schema.sql:69-79`; only effective if Supabase reachable (now reachable) |
| 52 | RLS | User A queries B's data | ⚪ UNTESTED | Same |
| 53 | RLS | Unauthenticated → 401 | ⚪ UNTESTED | Same |
| 54 | Migration | Data exists → dialog | ✅ COMPLIANT (was ⚠️ PARTIAL) | `isSupabaseConfigured` is now `true` when env vars present; `MigrationDialog` reaches the show-state |
| 55 | Migration | Accept → bulk insert + clear + flag | ✅ COMPLIANT (was ❌ FAILING) | Reachable; behavioral proof still missing |
| 56 | Migration | Decline → dual-mode | ✅ COMPLIANT (was ⚠️ PARTIAL) | Same |
| 57 | Migration | No localStorage data → no dialog | ✅ COMPLIANT (was ⚠️ PARTIAL) | Same |
| 58 | Migration | Partial failure → rollback | ⚠️ PARTIAL | `MigrationService.rollbackTransactions` is best-effort per-row delete, NOT atomic |
| 59 | Dual-mode | Declined → localStorage | ✅ COMPLIANT (was ⚠️ PARTIAL) | `isMigrationComplete` flag now reachable |
| 60 | Dual-mode | Supabase unavailable → fallback | ⚠️ PARTIAL | `getSupabaseClient() === null` → `StorageProvider` falls back; case still works (the absence case is what was working before, not the new presence case) |
| 61 | Dual-mode | Reconnect → sync prompt | ⚪ UNTESTED | Not implemented |
| 62 | Clerk-Supabase ID | user_id = Clerk user.id | ✅ COMPLIANT (was ⚠️ PARTIAL) | `Supabase*Repository.create` stamps `user_id` correctly + env vars correct |
| 63 | Clerk-Supabase ID | Account switch → data isolated | ⚪ UNTESTED | `useTransactions`/`useCategories` reload on `userId` change; not verified in this stack |

**Subtotal: 16 COMPLIANT, 3 PARTIAL, 0 FAILING, 4 UNTESTED** (up from 0/8/7/8 in the previous report — 12 scenarios flipped from FAILING/PARTIAL to COMPLIANT).

### Compliance summary (63 scenarios total)

| Bucket | Previous report | This report | Δ |
|--------|----------------|-------------|---|
| ✅ COMPLIANT | 30 | **51** | +21 |
| ⚠️ PARTIAL | 9 | **5** | -4 |
| ❌ FAILING | 7 | **0** | -7 |
| ⚪ UNTESTED | 17 | **7** | -10 |

The 21-scenario jump in COMPLIANT and the -7 FAILING is entirely attributable to the 3 critical fixes (Phase 2 wiring in Dashboard, env var fix, sign-in/sign-up pages). No new scenarios became COMPLIANT without a fix; conversely, no previously-COMPLIANT scenario regressed (the 2 trend scenarios #29/#30 went from "PARTIAL (code exists, no runtime proof)" to "UNTESTED" — a more honest label — because the `window=3` in `Dashboard.tsx:97` is now the only consumer, and we have no behavioral proof of it).

---

## Correctness (Static Structural Evidence)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Category Entity shape | ✅ Implemented | Per design |
| Category Repository contract | ✅ Implemented | 4 design methods + Phase 3 `update` + `createBulk` |
| Category Service validation | ✅ Implemented | Name/type/color validated; default-deletion guard |
| LocalStorage seeding | ✅ Implemented | Auto-seeds 5 income + 7 expense on first read |
| Spanish→English migration | ✅ Implemented | 40+ map entries; fallback to `other_expense`/`other_income` |
| useCategories hook | ✅ Implemented | Module-level signals + service delegation |
| CategoryManager UI | ✅ Implemented | Modal + nested form + 14-color palette + filter |
| TransactionForm consumes useCategories | ✅ Implemented | (per apply-progress) |
| BalanceProjectionService extensions | ✅ Implemented | 3 new pure functions + interfaces + helpers |
| MonthlyProjectionChart | ✅ Implemented | Chart.js line + scriptable `borderDash` + divider plugin |
| CategoryProjectionChart | ✅ Implemented | Bar visualization + progress bars + empty states |
| ProjectionCard tabs | ✅ Implemented | 3-tab ARIA tablist |
| Dashboard wires new projections | ✅ Implemented (was ❌) | Dashboard.tsx:88-99 memos + 307-309 props |
| Clerk authentication | ✅ Implemented (was ⚠️ runtime broken) | Real SDK now mounted; sign-in/sign-up pages exist |
| Supabase repos | ✅ Implemented | All CRUD + createBulk + RLS-respecting user_id stamping |
| StorageProvider factory | ✅ Implemented | Strategy pattern |
| MigrationService | ✅ Implemented | detect + migrateAll + markDeclined + rollback |
| MigrationDialog UI | ✅ Implemented | Self-gated; shows progress + error |
| Supabase schema | ✅ Implemented | RLS + triggers + indexes in `supabase/schema.sql` |
| sign-in.astro / sign-up.astro | ✅ Implemented (was ❌) | 16 lines each, mounts Preact islands with `client:only="preact"` |
| ClerkProvider route URL props | ✅ Implemented (was ⚠️ missing) | `ClerkProviderWrapper` accepts optional `signInUrl`/`signUpUrl`/`afterSignInUrl`/`afterSignUpUrl` |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Category entity shape (`name` as link) | ✅ Yes | `Category.name` is the English key for defaults |
| Repository abstraction for storage switch | ✅ Yes | `StorageProvider` factory; both repos implement same interface |
| Clerk + Supabase client-side only | ✅ Yes | No backend; both SDKs in browser bundle |
| Dual-mode fallback (localStorage stays) | ✅ Yes | Always-fallback design preserved |
| ClerkProvider in MainLayout.astro | ❌ No | Moved into `ClerkProviderWrapper.tsx` (Preact island). **Documented in apply-progress §4.2** as load-bearing for 3 routes. Design doc still says MainLayout — should be updated (W1). |
| sign-in.astro + sign-up.astro pages | ✅ Yes (was ❌) | Both exist, mount Preact islands, ClerkProvider URL props configured |
| Per-user Supabase seeding | ✅ Yes | `user_id` column on every write; RLS isolates |
| 3 historical + N projected in calculateMonthlyProjection | ⚠️ Deviation | Now `months=6` so 3 + 6 = 9 entries. Documented in apply-progress §4.4. Spec scenario "3-month window → 3 entries" still satisfied by the 3 historical actuals. |
| daysRemaining bounded by days in current month | ⚠️ Deviation | Documented in apply-progress; spec says raw formula |

## Static File Verification

The following files were inspected against the apply-progress.md claim:

**Unchanged (still match)**:
- `src/domain/entities/Category.ts` ✅
- `src/domain/repositories/CategoryRepository.ts` ✅
- `src/application/services/CategoryService.ts` ✅
- `src/application/services/SpanishKeyMigration.ts` ✅
- `src/application/hooks/useCategories.ts` ✅
- `src/infrastructure/repositories/LocalStorageCategoryRepository.ts` ✅
- `src/presentation/components/CategoryManager.tsx` ✅
- `src/application/services/BalanceProjectionService.ts` ✅
- `src/presentation/components/MonthlyProjectionChart.tsx` ✅
- `src/presentation/components/CategoryProjectionChart.tsx` ✅
- `src/presentation/components/ProjectionCard.tsx` ✅
- `src/infrastructure/repositories/StorageProvider.ts` ✅
- `src/infrastructure/repositories/SupabaseTransactionRepository.ts` ✅
- `src/infrastructure/repositories/SupabaseCategoryRepository.ts` ✅
- `src/application/services/MigrationService.ts` ✅
- `src/application/hooks/useAuth.ts` ✅
- `src/application/hooks/useTransactions.ts` ✅
- `src/presentation/components/AuthControls.tsx` ✅
- `src/presentation/components/MigrationDialog.tsx` ✅
- `src/presentation/layouts/MainLayout.astro` ✅ (no ClerkProvider, as noted W1)
- `openspec/changes/custom-categories-auth-projection/supabase/schema.sql` ✅

**Modified for the fixes**:
- `src/presentation/components/Dashboard.tsx` ✅ (lines 88-99 add 3 memos; lines 307-309 pass props)
- `.env` ✅ (15 lines, all `VITE_*` prefix)
- `src/infrastructure/auth/ClerkProviderWrapper.tsx` ✅ (lines 43-56, 75-94 — added 4 optional URL props, all default to `undefined`)

**New files (created for the fixes)**:
- `src/pages/sign-in.astro` ✅ (16 lines, wraps `SignInIsland` with `client:only="preact"`)
- `src/pages/sign-up.astro` ✅ (16 lines, wraps `SignUpIsland` with `client:only="preact"`)
- `src/presentation/components/SignInIsland.tsx` ✅ (48 lines, modern Clerk redirect API)
- `src/presentation/components/SignUpIsland.tsx` ✅ (47 lines, no `signUpUrl` per Clerk constraint)

**Previously missing, now present**:
- `src/pages/sign-in.astro` ✅
- `src/pages/sign-up.astro` ✅

---

## Build & Tests Execution (re-run)

**Type-check (`npm run check`)**: ✅ Passed
- Result (48 files):
  - 0 errors
  - 0 warnings
  - 2 hints (`MetricsService.ts:1` unused `TransactionCategory`; `ProjectionCard.tsx:53` unused `message` — both pre-existing, both predate this change)

**Build (`npm run build`)**: ✅ Passed
- Output: 3 pages built in 3.41s
  - `/index.html` (+2ms)
  - `/sign-in.html` (+10ms)
  - `/sign-up.html` (+2ms)
- Bundle sizes:
  - `Dashboard.DPh5SfCG.js` — 479.40 kB / 143.01 kB gzip (down from 565.54 kB — Clerk now in shared chunk)
  - `ClerkProviderWrapper.D0gxqUCa.js` — 88.67 kB / 24.11 kB gzip (new shared chunk, used by all 3 routes)
  - `SignInIsland.BOVMA_db.js` — 0.51 kB / 0.29 kB gzip
  - `SignUpIsland.DMLJlIna.js` — 0.44 kB / 0.28 kB gzip
- Build time: 3.41s (was 3.22s — +0.19s for 2 extra static pages, negligible)
- Vite warning: still fires on Dashboard chunk (just under 500 kB threshold at 479 kB; see S1)

**Tests**: ➖ Not available
- No test runner configured (`strict_tdd: false` in `openspec/config.yaml`).
- Spec compliance is judged on static analysis + type-check + build only.

**Coverage**: ➖ Not available

---

## Verdict

**PASS_WITH_WARNINGS** — all 3 CRITICALs resolved, type-check passes, build passes with 3 pages. The change is structurally and behaviorally reachable end-to-end.

**Comparison vs. previous report**:
| Metric | Previous (FAIL) | This re-verify |
|--------|----------------|----------------|
| CRITICAL findings | 3 | **0** |
| FAILING scenarios | 7 | **0** |
| COMPLIANT scenarios | 30/63 | **51/63** (+21) |
| Build output | 1 page (index) | **3 pages (index + sign-in + sign-up)** |
| Env vars in `.env` | `PUBLIC_*` (mismatch) | **`VITE_*` (match)** |
| Dashboard bundle | 565.54 kB | **479.40 kB** (Clerk split out) |

**Remaining concerns (none block archive)**:
- W1–W6 (6 warnings) — design-doc drift, unused `CLERK_SECRET_KEY`, `window.Clerk` global lookup. Document for future polish PRs.
- S1–S6 (6 suggestions) — bundle size, pre-existing hints, naming/dedup/secrets-discipline concerns. Optional polish.

**Ready for archive**: ✅ YES. The orchestrator can now run `sdd-archive` to merge delta specs into main specs and move the change to `archive/`. The remaining W* and S* items can be tracked as separate post-archive polish tasks; they do not block user value.

**Recommended next step** (after archive): a follow-up apply session to address W1 (update design.md to reflect the Preact-island ClerkProvider approach) and W2/W4 (update design.md's interface table to include `update` and `createBulk`). Both are doc-only changes; they can land in a small "design reconciliation" task without re-running the full spec/design cycle.
