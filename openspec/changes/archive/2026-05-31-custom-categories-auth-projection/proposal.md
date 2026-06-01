# Proposal: Custom Categories + Detailed Projections + Auth/Supabase

## Intent
Add 3 features to the finance dashboard: custom categories, detailed expense projections, and cross-device authentication with cloud persistence.

## Scope
- **IN**: Custom Categories CRUD, Monthly/category/trend projections, Clerk Auth + Supabase DB, localStorage migration
- **OUT**: Payments, PDF export, native mobile app

## Approach

### Feature 1: Custom Categories (Priority 1 - Foundation)

**Current State**: Categories hardcoded at 3 locations with Spanish/English key inconsistency:
- Domain: `food`, `transport`, `housing` (English)
- TransactionForm: `Alimentación`, `Transporte`, `Servicios` (Spanish)
- Dashboard: Color map with Spanish keys

**Approach**: Dynamic Category Entity + Repository (follows Clean Architecture)

**Changes**:
- **Domain**: Create `Category` entity (`id, name, type, color, icon, isDefault`), `CategoryRepository` interface
- **Infrastructure**: `LocalStorageCategoryRepository` (seed defaults on first load)
- **Application**: `useCategories()` hook, migration logic (Spanish → English keys)
- **Presentation**: `CategoryManager.tsx` (CRUD UI), update `TransactionForm.tsx` to use hook

**Migration**: On app load, check if `finance-dashboard-categories` key exists; if not, seed defaults. Map existing Spanish category strings to English domain keys.

### Feature 2: Detailed Expense Projection (Priority 2 - Builds on Categories)

**Current State**: `BalanceProjectionService.ts` only provides "days remaining" calculation.

**Approach**: Extend `BalanceProjectionService` with new methods + new chart components

**New Methods**:
- `calculateMonthlyProjection(transactions, months)` → monthly trend data
- `calculateCategoryProjections(transactions, categories)` → per-category burn rate + days remaining
- `calculateTrendAnalysis(transactions, window)` → moving average, direction, momentum

**New Components**:
- `MonthlyProjectionChart.tsx` (Chart.js line chart with dashed line for projected data)
- Expand `ProjectionCard.tsx` with tabs (overview / monthly / category)

### Feature 3: Auth + Supabase Cross-device Persistence (Priority 3 - Independent)

**Current State**: localStorage only, static site on GitHub Pages.

**Approach**: Clerk Auth + Supabase DB (client-side), preserves GitHub Pages hosting

**Stack**:
- **Auth**: Clerk (email, Google social login) - Free tier: 10K MAU
- **DB**: Supabase PostgreSQL with RLS - Free tier: 500MB
- **Hosting**: GitHub Pages (unchanged)

**Database Schema**:
```sql
-- transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  is_default BOOLEAN DEFAULT false
);

-- RLS
CREATE POLICY "Users can only see their own transactions"
  ON transactions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own categories"
  ON categories FOR ALL USING (user_id = auth.uid());
```

**Migration Strategy**:
1. Detect localStorage data on first login after integration
2. Show migration dialog: "Found X transactions. Sync to cloud?"
3. On confirm: bulk insert with `user_id` from Clerk session
4. On success: clear localStorage, set `migrationComplete` flag
5. Support dual-mode (localStorage fallback if user declines)

**Cost Analysis**:
- Clerk Free: 10K MAU → $0
- Supabase Free: 500MB DB → $0
- GitHub Pages: Free → $0
- **Total: $0/month**

## Affected Modules

| Module | Changes |
|--------|---------|
| domain/ | New Category entity, CategoryRepository interface |
| application/ | useCategories hook, extend BalanceProjectionService |
| infrastructure/ | LocalStorageCategoryRepository, SupabaseTransactionRepository, SupabaseCategoryRepository |
| presentation/ | CategoryManager, MonthlyProjectionChart, expand ProjectionCard, update TransactionForm |
| package.json | Add @clerk/clerk-react, @supabase/supabase-js |

## Rollback Plan
- Each feature is independent and revertible
- Auth: If fails, keep localStorage as fallback
- Supabase: Tables created manually, doesn't affect existing code
- Categories: If CRUD fails, revert to hardcoded arrays

## Success Criteria
- [ ] User can create/edit/delete custom categories
- [ ] Projection shows monthly and category breakdown
- [ ] Projection chart with dashed line for forecast
- [ ] Login with Google/Email works
- [ ] Data syncs between devices
- [ ] Migration from localStorage is atomic (all-or-nothing)
- [ ] $0 cost on free tiers

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Category key inconsistency (Spanish/English) | High | Normalize to English domain keys, migration script |
| Existing transactions need migration | Medium | Migration on app load, map Spanish→English |
| Clerk/Supabase user ID sync | Medium | Use Clerk user.id as user_id in Supabase |
| Migration from localStorage atomicity | High | Transactional migration, show progress |
| No offline mode on Supabase | Low | Show "offline" state, localStorage as cache |

## Priority Order
1. **Custom Categories** (foundation - needed by Feature 2)
2. **Detailed Expense Projection** (builds on categories)
3. **Auth + Supabase** (independent, highest effort)
