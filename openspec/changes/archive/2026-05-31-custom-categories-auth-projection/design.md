# Design: Custom Categories + Detailed Projections + Auth/Supabase

## Technical Approach

Three incremental features layered on Clean Architecture foundations: (1) Category entity replacing hardcoded arrays, (2) extended projection calculations with chart visualizations, (3) Clerk auth + Supabase persistence replacing localStorage as primary store. All features preserve the existing singleton-repository pattern and Astro/Preact stack.

## Architecture Decisions

### Decision: Category Entity Design

**Choice**: New `Category` entity with `id, name, type, color, icon?, isDefault` — stored separately from transactions, linked by category name string (not FK).
**Alternatives considered**: Embed category metadata in Transaction entity; use UUID FK between Transaction.category → Category.id.
**Rationale**: String-link avoids cascading migrations on existing data. Existing `Transaction.category` field is already a string. Embedding duplicates data. UUID FK would require rewriting all existing transactions during migration.

### Decision: Repository Abstraction for Storage Switch

**Choice**: Strategy pattern — `StorageProvider` interface selects `LocalStorageCategoryRepository` or `SupabaseCategoryRepository` at runtime based on auth state.
**Alternatives considered**: Conditional if/else inside each repository; adapter pattern wrapping both.
**Rategy**: Strategy keeps each repo implementation clean. The `StorageProvider` is a simple factory that checks Clerk session → returns Supabase repo or localStorage repo. Existing `transactionRepository` singleton is refactored into `createTransactionRepository(userId?)`.

### Decision: Clerk + Supabase Client-Side Only

**Choice**: Use `@clerk/clerk-react` (client) + `@supabase/supabase-js` (client) directly. No backend server.
**Alternatives considered**: Supabase Auth instead of Clerk; Next.js middleware for auth.
**Rationale**: GitHub Pages hosting = static site only. Clerk free tier covers 10K MAU. Supabase RLS handles security without a backend. Supabase Auth was rejected because Clerk provides better UI components and social login UX out of the box.

### Decision: Dual-Mode Fallback

**Choice**: localStorage remains as offline fallback. Auth state determines primary storage.
**Alternatives considered**: Force migration on first login only; localStorage always as read-only cache.
**Rationale**: Proposal requires atomic migration with user consent. Dual-mode lets users who decline migration continue working. Offline fallback is critical for PWA-like behavior.

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    PRESENTATION                       │
│  Dashboard.tsx ← useTransactions() ← useCategories() │
│       ↓                    ↓                ↓         │
│  ProjectionCard    TransactionForm    CategoryManager  │
│  MonthlyProjectionChart                                 │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                   APPLICATION                         │
│  TransactionService    CategoryService                │
│  BalanceProjectionService (extended)                  │
│  useFinancialMetrics                                 │
└───────┬───────────────────────┬─────────────────────┘
        │                       │
┌───────▼───────┐   ┌───────────▼───────────┐
│   DOMAIN       │   │   INFRASTRUCTURE      │
│ Transaction    │   │ TransactionRepository │
│ Category (new) │   │   ├─ LocalStorage     │
│ TransactionRepo│   │   └─ Supabase (new)   │
│ CategoryRepo   │   │ CategoryRepository    │
│ (new interface)│   │   ├─ LocalStorage (new)│
│                │   │   └─ Supabase (new)   │
└────────────────┘   │ StorageProvider (new) │
                     └───────────────────────┘
```

### Auth + Data Flow Sequence

```
User → Clerk Login → Clerk Session (JWT)
  │
  ├─ On Login Success:
  │   ├─ Check localStorage: 'finance-dashboard-migration-complete' flag
  │   ├─ IF flag === false AND localStorage has data:
  │   │   └─ Show MigrationDialog → User confirms
  │   │       ├─ Bulk insert (transactions + categories) to Supabase
  │   │       ├─ Set migrationComplete = true
  │   │       └─ Clear localStorage keys
  │   ├─ IF flag === true OR no localStorage data:
  │   │   └─ Proceed to dashboard (Supabase as primary)
  │   └─ Initialize Supabase client with Clerk JWT:
  │       supabase.auth.setSession({ access_token: clerk.session.id })
  │
  ├─ CRUD Operations:
  │   ├─ IF authenticated → SupabaseTransactionRepository
  │   └─ IF offline → LocalStorageTransactionRepository
  │
  └─ On Logout:
      └─ Clear Supabase session, optionally keep localStorage
```

### Migration Flow Sequence

```
MigrationDialog
  │
  ├─ User clicks "Sincronizar"
  │   ├─ Loading state: "Sincronizando 47 transacciones..."
  │   ├─ transactionRepositorySupabase.createBulk(transactions)
  │   │   ├─ Supabase: INSERT INTO transactions (user_id, ...) VALUES ...
  │   │   ├─ On success: categoryRepositorySupabase.createBulk(categories)
  │   │   └─ On ANY failure: ROLLBACK all inserts
  │   ├─ localStorage.removeItem('finance-dashboard-transactions')
  │   ├─ localStorage.setItem('finance-dashboard-migration-complete', 'true')
  │   └─ Redirect to dashboard
  │
  └─ User clicks "Usar local"
      └─ localStorage mode continues, no Supabase calls
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/domain/entities/Category.ts` | Create | Category entity interface + types |
| `src/domain/repositories/CategoryRepository.ts` | Create | Repository interface for categories |
| `src/domain/index.ts` | Modify | Export Category entity and CategoryRepository |
| `src/infrastructure/repositories/LocalStorageCategoryRepository.ts` | Create | localStorage implementation with default seeding |
| `src/infrastructure/repositories/SupabaseTransactionRepository.ts` | Create | Supabase implementation of TransactionRepository |
| `src/infrastructure/repositories/SupabaseCategoryRepository.ts` | Create | Supabase implementation of CategoryRepository |
| `src/infrastructure/repositories/StorageProvider.ts` | Create | Factory selecting repository based on auth state |
| `src/infrastructure/index.ts` | Modify | Export new repositories + StorageProvider |
| `src/application/services/CategoryService.ts` | Create | Business logic for category CRUD |
| `src/application/services/BalanceProjectionService.ts` | Modify | Add calculateMonthlyProjection, calculateCategoryProjections, calculateTrendAnalysis |
| `src/application/hooks/useCategories.ts` | Create | Hook for category state + CRUD |
| `src/application/hooks/useTransactions.ts` | Modify | Use StorageProvider instead of direct repository import |
| `src/application/services/MigrationService.ts` | Create | Handles localStorage → Supabase atomic migration |
| `src/presentation/components/CategoryManager.tsx` | Create | CRUD UI for categories with modal form |
| `src/presentation/components/TransactionForm.tsx` | Modify | Replace hardcoded arrays with useCategories hook |
| `src/presentation/components/ProjectionCard.tsx` | Modify | Add tabs (Overview / Monthly / Category) |
| `src/presentation/components/MonthlyProjectionChart.tsx` | Create | Chart.js line chart with dashed projection lines |
| `src/presentation/components/MigrationDialog.tsx` | Create | Migration prompt shown on first login |
| `src/presentation/components/Dashboard.tsx` | Modify | Wire up new hooks and components |
| `package.json` | Modify | Add @clerk/clerk-react, @supabase/supabase-js |

## New Interfaces

### Category Entity

```typescript
// src/domain/entities/Category.ts
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  isDefault: boolean;
}
```

### CategoryRepository Interface

```typescript
// src/domain/repositories/CategoryRepository.ts
export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  save(category: Omit<Category, 'id'>): Promise<Category>;
  delete(id: string): Promise<boolean>;
}
```

### StorageProvider (Strategy Factory)

```typescript
// src/infrastructure/repositories/StorageProvider.ts
export interface StorageProvider {
  getTransactionRepository(userId?: string): TransactionRepository;
  getCategoryRepository(userId?: string): CategoryRepository;
}
```

### Extended Projection Methods

```typescript
// Added to BalanceProjectionService.ts
calculateMonthlyProjection(
  transactions: Transaction[],
  months: number
): { month: string; totalIncome: number; totalExpenses: number; balance: number }[];

calculateCategoryProjections(
  transactions: Transaction[],
  categories: Category[]
): { categoryId: string; name: string; totalSpent: number; avgMonthly: number; daysRemaining: number }[];

calculateTrendAnalysis(
  transactions: Transaction[],
  window: number
): { movingAverage: number; direction: 'up' | 'down' | 'stable'; momentum: 'accelerating' | 'decelerating' | 'constant' } | null;
```

### Migration State

```typescript
// src/application/services/MigrationService.ts
export interface MigrationState {
  hasLocalStorageData: boolean;
  isMigrationComplete: boolean;
  transactionCount: number;
}
```

## Supabase Schema

```sql
-- Already defined in proposal, referenced here for design completeness
-- transactions table with user_id FK, RLS policy
-- categories table with user_id FK, RLS policy
-- Clerk user.id mapped directly to user_id column
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | BalanceProjectionService new methods | Pure functions, call directly with mock data |
| Unit | CategoryService CRUD logic | Mock repository, verify delegation |
| Unit | MigrationService state detection | Mock localStorage, verify flag checks |
| Integration | StorageProvider routing | Verify correct repo returned based on auth state |
| Integration | CategoryManager form flows | Component render + interaction (manual) |
| E2E | Full auth → migration → CRUD cycle | Manual: login, verify migration, create/edit/delete |

**Note**: No test runner configured. Type checking via `astro check` is the primary quality gate.

## Migration / Rollout

### Phase 1: Custom Categories (no auth dependency)
1. Create Category entity + CategoryRepository interface
2. Implement LocalStorageCategoryRepository with default seeding
3. Create useCategories hook
4. Build CategoryManager component
5. Update TransactionForm to use hook
6. Run Spanish → English key migration on app load

### Phase 2: Extended Projections (no auth dependency)
1. Add new methods to BalanceProjectionService
2. Create MonthlyProjectionChart component
3. Extend ProjectionCard with tabs

### Phase 3: Auth + Supabase (independent)
1. Install Clerk + Supabase packages
2. Configure Clerk provider in Astro layout
3. Create SupabaseTransactionRepository + SupabaseCategoryRepository
4. Create StorageProvider factory
5. Create MigrationService + MigrationDialog
6. Refactor useTransactions to use StorageProvider
7. Test dual-mode fallback

### Data Migration (atomic)
1. Detect localStorage data on first login
2. Show migration dialog with transaction count
3. Bulk insert to Supabase with user_id
4. On success: clear localStorage, set flag
5. On failure: rollback all inserts, show error

## Open Questions

- [ ] Should we use Clerk's `user.id` directly or Supabase's `auth.uid()`? (Proposal says Clerk user.id — verify compatibility with Supabase RLS `auth.uid()`)
- [ ] Should categories be seeded per-user in Supabase or shared as defaults? (Design assumes per-user for custom categories, defaults seeded on migration)
- [ ] Chart.js registration: should MonthlyProjectionChart reuse the global Chart.register pattern or register per-component? (Existing CategoryChart registers globally)
- [ ] Offline sync strategy: when user reconnects after offline CRUD, should we push-pull or just pull? (Design assumes pull-only, offline changes are lost)
