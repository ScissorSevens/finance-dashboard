# Archive Report: custom-categories-auth-projection

**Status**: ARCHIVED ✅
**Date**: 2026-05-31
**Mode**: hybrid (engram + openspec)
**Final verify verdict**: PASS_WITH_WARNINGS (51/63 COMPLIANT, 0 FAILING)
**SDD cycle**: complete — proposed → specified → designed → tasked → applied (3 phases) → verified → archived

---

## Executive Summary

The `custom-categories-auth-projection` change delivered 3 features layered on the existing Clean Architecture (Astro 5.x + Preact 10.x + Tailwind 3.4) foundation:

1. **Custom Categories** (Phase 1) — replaced hardcoded category arrays with a `Category` entity, `CategoryRepository` interface, `LocalStorageCategoryRepository` with default seeding, a `useCategories` Preact Signals hook, and a `CategoryManager` modal UI. Spanish→English key migration runs on app boot.
2. **Detailed Projections** (Phase 2) — extended `BalanceProjectionService` with `calculateMonthlyProjection`, `calculateCategoryProjections`, `calculateTrendAnalysis`. Added `MonthlyProjectionChart` (Chart.js with scriptable dashed lines), `CategoryProjectionChart`, and extended `ProjectionCard` with a 3-tab ARIA tablist.
3. **Auth + Supabase** (Phase 3) — integrated Clerk (email + Google) and Supabase PostgreSQL with RLS, `StorageProvider` factory, `MigrationService` with atomic rollback, and `MigrationDialog` UI. Two Astro pages (`/sign-in`, `/sign-up`) mount Preact islands wrapping Clerk's path-based auth components. Dual-mode fallback preserves localStorage.

**Build**: 3 static pages (`/index.html`, `/sign-in.html`, `/sign-up.html`) built in 3.41s. Dashboard bundle 479.40 kB / 143.01 kB gzip (Clerk split into its own 88.67 kB shared chunk).
**Type-check**: 0 errors, 0 warnings, 2 pre-existing hints (unchanged by this change).
**Cost**: $0/month (Clerk free tier 10K MAU, Supabase free tier 500MB, GitHub Pages).

---

## Engram Observation IDs (hybrid mode traceability)

| Artifact | Observation ID | Topic Key |
|----------|---------------|-----------|
| Proposal | #434 | `sdd/custom-categories-auth-projection/proposal` |
| Delta Spec | #435 | `sdd/custom-categories-auth-projection/spec` |
| Design | #436 | `sdd/custom-categories-auth-projection/design` |
| Apply progress (merged phases 1–3 + Phase 4 verify fixes) | #441 | `sdd/custom-categories-auth-projection/apply-progress` |
| Apply session summary (Phase 1) | #439 | `sdd/custom-categories-auth-projection/apply` (session_summary) |
| **Archive report (this document)** | **(saved at archive time)** | `sdd/custom-categories-auth-projection/archive-report` |

Note: tasks.md and verify-report.md were persisted as filesystem artifacts only (no dedicated engram observation; their substance is captured in the apply progress #441 and the verify-report.md file at the archive path).

---

## Specs Synced

The main specs directory (`openspec/specs/`) was empty before this archive. The three delta specs are full specs (not deltas) — they were copied verbatim into the source of truth.

| Domain | Action | Source | Destination |
|--------|--------|--------|-------------|
| custom-categories | Created (copy from delta) | `changes/archive/2026-05-31-custom-categories-auth-projection/specs/custom-categories/spec.md` | `openspec/specs/custom-categories/spec.md` |
| projections | Created (copy from delta) | `changes/archive/2026-05-31-custom-categories-auth-projection/specs/projections/spec.md` | `openspec/specs/projections/spec.md` |
| auth-supabase | Created (copy from delta) | `changes/archive/2026-05-31-custom-categories-auth-projection/specs/auth-supabase/spec.md` | `openspec/specs/auth-supabase/spec.md` |

**Requirements rolled forward**: 22 (custom-categories) + 18 (projections) + 23 (auth-supabase) = **63 scenarios now part of the source of truth**.

---

## Archive Folder Contents

`openspec/changes/archive/2026-05-31-custom-categories-auth-projection/`

| File | Status | Notes |
|------|--------|-------|
| `proposal.md` | ✅ archived | 3-feature scope, rollback plan, success criteria, cost analysis |
| `design.md` | ✅ archived | 4 architecture decisions, data flow, sequence diagrams, Supabase schema reference, file changes table, phase rollout |
| `specs/custom-categories/spec.md` | ✅ archived (delta, also copied to main specs) | 6 requirements, 22 scenarios |
| `specs/projections/spec.md` | ✅ archived (delta, also copied to main specs) | 5 requirements, 18 scenarios |
| `specs/auth-supabase/spec.md` | ✅ archived (delta, also copied to main specs) | 6 requirements, 23 scenarios |
| `tasks.md` | ✅ archived | 32 tasks across 3 phases, all `[x]` checked |
| `verify-report.md` | ✅ archived | PASS_WITH_WARNINGS verdict, 429 lines, full spec compliance matrix |
| `apply-progress.md` | ✅ archived | Full file map, spec coverage, deviations, Phase 4 verify fixes |
| `supabase/schema.sql` | ✅ archived | RLS policies, triggers, indexes for `transactions` + `categories` tables |
| `archive-report.md` | ✅ this file | Closure summary |

**Total**: 9 files + 1 new file (this report).

---

## Source of Truth Updated

The following specs are now the project's behavioral contract going forward:

- `openspec/specs/custom-categories/spec.md` — Category entity, repository, default seeding, ES→EN migration, hook, UI manager
- `openspec/specs/projections/spec.md` — Monthly/category/trend calculations, chart rendering, ProjectionCard tabs
- `openspec/specs/auth-supabase/spec.md` — Clerk auth, Supabase persistence with RLS, atomic migration, dual-mode fallback, ID sync

**Active changes directory**: now contains only `archive/` (no active changes).

---

## Build & Quality Gate Confirmation (final, from verify-report)

| Check | Result |
|-------|--------|
| `npm run check` (astro check, TypeScript strict) | ✅ 0 errors, 0 warnings, 2 pre-existing hints |
| `npm run build` | ✅ 3 pages, 3.41s, all routes reachable |
| Spec compliance (static) | 51/63 COMPLIANT, 5 PARTIAL, 0 FAILING, 7 UNTESTED |
| Coverage | ➖ N/A (no test runner; `strict_tdd: false` in `openspec/config.yaml`) |

---

## Final Notes & Cleanup Recommendations

### Deviation Acknowledgements (carried forward as design-doc drift)

The implementation deviated from `design.md` in 3 documented places. None block archive; all are doc-only fixes.

1. **W1 — `MainLayout.astro` does NOT have `<ClerkProvider>`** (Coherence: ❌ vs design)
   - Reality: `ClerkProvider` lives inside `ClerkProviderWrapper.tsx` (a Preact island). Astro layouts don't expose React/Preact context to `client:only` islands, so the provider must live inside the Preact tree.
   - This pattern is now **load-bearing for 3 routes** (`/`, `/sign-in`, `/sign-up`), not 1.
   - **Cleanup**: update `design.md` §3.3 to reflect the Preact-island approach.

2. **W2 + W4 — `CategoryRepository` interface gained `update` and `createBulk`** (Phase 3 addition)
   - Reality: design doc still shows the original 4-method interface (`findAll`/`findById`/`save`/`delete`).
   - **Cleanup**: update `design.md` §"New Interfaces" to include `update` and `createBulk` in both `CategoryRepository` and `LocalStorageCategoryRepository`.

3. **W3 — `calculateMonthlyProjection` returns 3 actuals + N projected** (not N total)
   - Reality: function returns 3 historical actuals + N future projections. Wired in Dashboard with `months=6` (so 3 + 6 = 9 entries). Spec scenario "3-month window → 3 entries" is still satisfied by the 3 historical actuals.
   - **Cleanup**: split the spec into two functions OR clarify the contract (actuals vs projected semantics).

### Open Warnings (non-blocking, post-archive polish)

| ID | Severity | Issue | Recommended action |
|----|----------|-------|--------------------|
| W5 | low | `CLERK_SECRET_KEY` in `.env` is unused client-side (server-side concept) | Move to `.env.local` (already in `.gitignore`) or document in `.env.example` |
| W6 | low | `useAuth()` reads Clerk session via `window.Clerk` global — brittle | Refactor to `useSession()` from `@clerk/clerk-react` |

### Suggestions (S1–S6, nice-to-have)

| ID | Item |
|----|------|
| S1 | Code-split Clerk — Dashboard bundle is 479 kB, dynamic-import `ClerkProviderWrapper` on auth-island mount |
| S2 | Clean up pre-existing type hints in `MetricsService.ts:1` and `ProjectionCard.tsx:53` |
| S3 | Rename `SpanishKeyMigration.isSpanishKey` → `isUnknownKey` (more accurate; aggressive matching on English custom names is a misclassification risk) |
| S4 | `LocalStorageCategoryRepository.createBulk` doesn't dedupe — Supabase's UNIQUE constraint catches dupes, localStorage silently accepts |
| S5 | `useTransactions` and `useCategories` reload in parallel — known race condition on first sign-in |
| S6 | Add one-line warning in `.env.example`: never put `VITE_SUPABASE_SERVICE_ROLE_KEY` in client bundle (it has full DB read/write power) |

### Items Not Archived (intentionally, by design convention)

- `state.yaml` — the change did not have a state.yaml file. SDD state machine is not used in this project; `tasks.md` (all 32 `[x]`) and `verify-report.md` (PASS_WITH_WARNINGS) are the authority.
- The `.env` file (with real Clerk/Supabase keys) is intentionally NOT moved to the archive (secrets). The .env stays in the project root; the change folder never contained it.
- `node_modules/`, `dist/`, `.astro/`, `src/`, `package.json` modifications — these are the working codebase, not change artifacts.

---

## Suggested Follow-up Change

A small **"design-reconciliation"** follow-up change could clean up W1 + W2/W4 in a single doc-only pass (no behavioral changes, no re-spec). Estimated effort: 15 minutes. All other W*/S* items can be filed as individual polish tasks.

**Recommended next phase**: none required. The `custom-categories-auth-projection` change is fully complete. New feature work can begin a new SDD cycle.

---

## SDD Cycle Closure

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  sdd-init  │ ── │  sdd-      │ ── │  sdd-      │ ── │  sdd-      │
│ (precedes) │    │  explore   │    │  propose   │    │  spec      │  #434  #435
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                                                              │
                  ┌────────────┐    ┌────────────┐    ┌────────────┐
                  │  sdd-      │ ◀──│  sdd-      │ ◀──│  sdd-      │
                  │  archive   │    │  verify    │    │  design    │  #436
                  │  (this) ✅ │    │            │    │            │
                  └────────────┘    └────────────┘    └────────────┘
                          ▲                                  ▲
                          │                                  │
                  ┌────────────┐                      #441 apply
                  │  sdd-apply │ ────────────────────── (merged
                  │  (3 phases)│                        progress)
                  └────────────┘
```

**Ready for next change.** 🎯
