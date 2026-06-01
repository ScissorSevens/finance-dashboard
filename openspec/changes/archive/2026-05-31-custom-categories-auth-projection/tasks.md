# Tasks: Custom Categories + Projections + Auth/Supabase

## Phase 1: Custom Categories (foundation, no auth)

### 1.1 Domain
- [x] 1.1 Create `src/domain/entities/Category.ts` (`Category` interface: id, name, type, color, icon?, isDefault); re-export from `src/domain/index.ts`.
- [x] 1.2 Create `src/domain/repositories/CategoryRepository.ts` (`findAll`, `findById`, `save`, `delete`); re-export from `src/domain/index.ts`.
- [x] 1.3 Create `src/application/services/CategoryService.ts` with `getAll/add/update/remove` plus `isDefault` deletion guard.

### 1.2 Infrastructure
- [x] 1.4 Create `src/infrastructure/repositories/LocalStorageCategoryRepository.ts`; seed 7 expense + 5 income defaults on first load.
- [x] 1.5 Create `src/application/services/SpanishKeyMigration.ts` mapping ES→EN (`Alimentación→food`, `Transporte→transport`, `Servicios→utilities`, etc.); run on app boot.

### 1.3 Application
- [x] 1.6 Create `src/application/hooks/useCategories.ts` returning `{categories, addCategory, updateCategory, deleteCategory, isLoading}` (Preact Signals).
- [x] 1.7 Wire `useCategories` + Spanish migration into `Dashboard.tsx` (load on mount).

### 1.4 Presentation
- [x] 1.8 Create `src/presentation/components/CategoryManager.tsx` (modal form, color picker, edit/delete; reject delete on `isDefault`).
- [x] 1.9 Update `TransactionForm.tsx` to consume `useCategories()`; replace hardcoded `INCOME_CATEGORIES`/`EXPENSE_CATEGORIES`.
- [x] 1.10 `npm run check`; verify specs/custom-categories scenarios (CRUD, default seed, ES→EN migration, isDefault guard).

## Phase 2: Detailed Projections (builds on Phase 1)

### 2.1 Service
- [x] 2.1 Add `calculateMonthlyProjection(transactions, months)` to `BalanceProjectionService.ts` returning `{month, totalIncome, totalExpenses, balance}[]` (future months use current rate).
- [x] 2.2 Add `calculateCategoryProjections(transactions, categories)` returning per-category `{categoryId, name, totalSpent, avgMonthly, daysRemaining}`.
- [x] 2.3 Add `calculateTrendAnalysis(transactions, window)` returning `{movingAverage, direction, momentum}` (null when <2 months of data).

### 2.2 Charts
- [x] 2.4 Create `src/presentation/components/MonthlyProjectionChart.tsx` (Chart.js line; solid past, dashed projected, empty state).
- [x] 2.5 Extend `CategoryChart.tsx` (or subcomponent) to render `calculateCategoryProjections` output with progress bars.

### 2.3 UI
- [x] 2.6 Extend `ProjectionCard.tsx` with Overview/Monthly/Category tabs; Overview default.
- [x] 2.7 Mount new charts in `Dashboard.tsx` inside ProjectionCard Monthly/Category tabs.
- [x] 2.8 `npm run check`; verify specs/projections scenarios (3-month window, empty, future projection, daysRemaining, trend direction, stable, insufficient data).

## Phase 3: Auth + Supabase (independent)

### 3.1 Setup
- [x] 3.1 Install `@clerk/clerk-react` + `@supabase/supabase-js`; add `VITE_CLERK_PUBLISHABLE_KEY` and Supabase URL/anon key to `.env` + `.env.example`.
- [x] 3.2 Create Supabase tables `transactions` + `categories` (per proposal §Schema) with RLS policies (`user_id = auth.uid()`).
- [x] 3.3 Add `ClerkProvider` to `src/presentation/layouts/MainLayout.astro`; create `src/pages/sign-in.astro` and `src/pages/sign-up.astro`.

### 3.2 Repositories
- [x] 3.4 Create `src/infrastructure/repositories/SupabaseTransactionRepository.ts` (CRUD + `createBulk`, map Clerk `user.id` → `user_id`).
- [x] 3.5 Create `src/infrastructure/repositories/SupabaseCategoryRepository.ts` (CRUD + `createBulk`).
- [x] 3.6 Create `src/infrastructure/repositories/StorageProvider.ts` factory returning Supabase or localStorage repo based on Clerk session.
- [x] 3.7 Update `useTransactions.ts` to consume `StorageProvider`; remove direct `transactionService` singleton import.

### 3.3 Migration UI
- [x] 3.8 Create `src/application/services/MigrationService.ts` (`detectLocalData`, `migrateAll` with transactional rollback, `setMigrationComplete`).
- [x] 3.9 Create `src/presentation/components/MigrationDialog.tsx` (Confirm/Decline, "Sincronizando X..." progress).
- [x] 3.10 Mount `MigrationDialog` in `Dashboard.tsx` after session active; clear localStorage + set `finance-dashboard-migration-complete` on success.

### 3.4 Verification
- [x] 3.11 Verify specs/auth-supabase scenarios (login, RLS isolation, atomic rollback, dual-mode fallback, Clerk↔Supabase ID sync).
- [x] 3.12 `npm run check` + `npm run build`; confirm $0/mo (Clerk 10K MAU, Supabase 500MB, GitHub Pages).
