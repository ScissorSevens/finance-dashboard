# Design — Dashboard UI Modernization

**Change**: `dashboard-ui-modernization`
**Date**: 2026-06-01

## 1. Architecture overview

No new packages. No new architectural layers. This is a UI polish change that touches:

- **One pure helper** (`useMonthlyTrend` in `useFinancialMetrics.ts`)
- **One new component** (the redesigned `MetricCard.tsx`)
- **One new CSS class** (`.card-modern` in `global.css`)
- **One CSS variable / token** (`shadow-glow` in `tailwind.config.mjs`)
- **One Astro layout tweak** (dark mode flash fix in `MainLayout.astro`)

The data flow is unchanged: transactions flow through the existing `useFinancialMetrics` hook; the new `useMonthlyTrend` helper co-locates with it; `Dashboard.tsx` calls both and passes derived data to `<MetricCard>`.

```
useTransactions → useFinancialMetrics + useMonthlyTrend
                              ↓
                       Dashboard.tsx
                              ↓
                ┌─────────────┼─────────────┐
                ↓             ↓             ↓
            MetricCard    MetricCard    MetricCard
              (income)     (expense)    (balance)
                ↓
        inline SVG sparkline
```

## 2. File-by-file design

### 2.1 `src/application/hooks/useFinancialMetrics.ts` — add `useMonthlyTrend`

**Add** (alongside the existing `useFinancialMetrics`):

```ts
export type TrendMetric = 'balance' | 'income' | 'expense';
export interface MonthlyTrend {
  /** 6 trailing months, oldest → newest. */
  series: number[];
  /** MoM % change; null when there's no prior month to compare. */
  changePct: number | null;
  /** Semantic direction (good/bad depends on metric, not direction). */
  direction: 'up' | 'down' | 'flat';
}

export function useMonthlyTrend(
  transactions: Transaction[],
  metric: TrendMetric,
  lookbackMonths = 6
): MonthlyTrend {
  // Implementation: bucket by local calendar month, sum net flow or
  // type-filtered amount, return the last `lookbackMonths` buckets
  // (padded with zeros if the user has < 6 months of data).
}
```

**Bucketing**:
- Group by `YYYY-MM` derived from `t.date` (local time)
- For `balance`: net flow = `sum(income) - sum(expense)` per month
- For `income`: sum of `t.amount` where `t.type === 'income'` per month
- For `expense`: sum of `t.amount` where `t.type === 'expense'` per month
- Zero-pad trailing months if user has < 6 months of data (so the sparkline shows "started recently")

**`changePct`**:
- `series[series.length - 1]` = current month
- `series[series.length - 2]` = previous month
- If previous is 0 → `changePct: null` (avoid div by zero; UI shows "—")
- Otherwise `(current - previous) / abs(previous) * 100`
- `direction` is the sign of `current - previous` (rounded to nearest 0.01 to avoid jitter)

### 2.2 `src/presentation/components/MetricCard.tsx` — full rewrite

**New props**:
```ts
interface MetricCardProps {
  title: string;
  value: string;
  type: 'balance' | 'income' | 'expense';
  sparklineData: number[];          // 6 points
  changePct: number | null;
  icon: 'trending-up' | 'trending-down' | 'wallet';
}
```

**New visual**:
```jsx
<article class="card-modern p-6 flex flex-col gap-3">
  <header class="flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
      {title}
    </span>
    <Icon name={icon} class="h-5 w-5 text-surface-400" />
  </header>
  <div class="text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
    {value}
  </div>
  <footer class="flex items-end justify-between gap-3">
    <Sparkline data={sparklineData} color={sparklineColor} />
    <TrendLabel changePct={changePct} direction={direction} metric={type} />
  </footer>
</article>
```

**Icon map** (lucide-style, inline SVG):
- `trending-up` → arrow trending up-right
- `trending-down` → arrow trending down-right
- `wallet` → wallet outline

**Sparkline component** (inline in same file, ~20 LOC):
- `<svg viewBox="0 0 60 20" preserveAspectRatio="none" class="h-10 w-24">`
- Compute polyline points: min/max normalize the data, map to x=0..60, y=20..0
- Render `<polyline points="..." fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />`
- Optional `<polygon>` for the area fill (same points closed back to baseline, 10% opacity)

**Color map** (semantic, by metric type):
- `balance` → `text-primary-600 dark:text-primary-400` (line)
- `income` → `text-accent-600 dark:text-accent-400` (line)
- `expense` → `text-danger-600 dark:text-danger-400` (line)

**TrendLabel**:
- Up arrow + green: when `direction === 'up'` AND metric is income/balance
- Down arrow + green: when `direction === 'down'` AND metric is expense
- Up arrow + red: when `direction === 'up'` AND metric is expense
- Down arrow + red: when `direction === 'down'` AND metric is income/balance
- "—" (em dash) + neutral color: when `changePct === null`
- "0.0%" (no arrow) + neutral: when `Math.abs(changePct) < 0.05`

**Reduced motion**:
- The hover lift (REQ-6) uses `motion-reduce:transform-none` and `motion-reduce:hover:translate-y-0`
- Sparkline is static (no animation needed)

### 2.3 `src/styles/global.css` — add `.card-modern`

**Add** at the bottom of the `@layer components` block:

```css
.card-modern {
  @apply bg-white dark:bg-surface-800 rounded-2xl shadow-soft
         border border-surface-200/60 dark:border-surface-700/60
         p-6 transition-all duration-200 ease-out
         motion-reduce:transition-none;
}
.card-modern-interactive {
  @apply card-modern hover:shadow-glow hover:-translate-y-0.5
         motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-soft;
}
```

We expose two variants:
- `.card-modern` — base surface, no hover
- `.card-modern-interactive` — adds hover lift + glow (for clickable cards; the chart cards in this change are not clickable, so we use `.card-modern` for them)

If a future change adds clickable cards, they can use `.card-modern-interactive`.

### 2.4 `tailwind.config.mjs` — add `boxShadow.glow`

**Add** to the existing `boxShadow` extend:

```js
'glow': '0 4px 20px -2px rgba(14, 165, 233, 0.12), 0 0 0 1px rgba(14, 165, 233, 0.05)',
```

This is a primary-tinted (`primary-500` ≈ `#0ea5e9`) soft shadow.

### 2.5 `src/presentation/layouts/MainLayout.astro` — fix dark flash

**Change 1**: add `style="color-scheme: light dark"` to `<html>`
**Change 2**: ensure the theme script is `is:inline` (it already is; verify Astro doesn't bundle it via the script tag attributes)
**Change 3**: move the toggle click handler into the same `is:inline` script so it's available before the page is interactive (otherwise users can click the button and nothing happens until JS hydrates)

```astro
<script is:inline>
  // ... existing class-set code ...

  // Bind click handler ASAP to avoid unresponsive button
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const html = document.documentElement;
      const isDark = html.classList.contains('dark');
      if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  }
</script>
```

Remove the existing non-inline `<script>` block (lines 57-73) since the inline version supersedes it.

### 2.6 `src/presentation/components/Dashboard.tsx` — wire it up

**Change 1**: import `useMonthlyTrend` and `TrendMetric`
**Change 2**: compute trends for each KPI

```ts
const balanceTrend = useMonthlyTrend(transactions.value, 'balance');
const incomeTrend = useMonthlyTrend(transactions.value, 'income');
const expenseTrend = useMonthlyTrend(transactions.value, 'expense');
```

**Change 3**: replace the 3 MetricCard calls

```jsx
<MetricCard
  title="Balance Total"
  value={formatCurrency(totals.value.balance)}
  type="balance"
  sparklineData={balanceTrend.series}
  changePct={balanceTrend.changePct}
  icon="wallet"
/>
<MetricCard
  title="Ingresos del Mes"
  value={formatCurrency(totals.value.income)}
  type="income"
  sparklineData={incomeTrend.series}
  changePct={incomeTrend.changePct}
  icon="trending-up"
/>
<MetricCard
  title="Gastos del Mes"
  value={formatCurrency(totals.value.expense)}
  type="expense"
  sparklineData={expenseTrend.series}
  changePct={expenseTrend.changePct}
  icon="trending-down"
/>
```

**Change 4**: replace `space-y-8` with `space-y-10` on the dashboard root div

### 2.7 Chart card wrapper changes

For each of `CategoryChart`, `ExpenseChart`, `BalanceBurndownChart`, `ProjectionCard`, `MonthlyComparison`:

Find the existing root container class (e.g. `bg-white rounded-xl shadow-md p-6`) and replace with `card-modern`. Don't touch the inner chart rendering.

**Example** (CategoryChart):
```diff
- <div class="bg-white rounded-xl shadow-md p-6">
+ <div class="card-modern">
```

## 3. Sparkline math (precise spec)

Given `data: number[]` of length ≤ 6:

```
min = Math.min(...data, 0)        // include 0 so flat trends don't disappear
max = Math.max(...data, 0)
range = max - min || 1           // avoid /0

points = data.map((v, i) => {
  const x = (i / (data.length - 1 || 1)) * 60  // 60px viewBox width
  const y = 20 - ((v - min) / range) * 20      // 20px viewBox height, inverted
  return `${x.toFixed(2)},${y.toFixed(2)}`
}).join(' ')
```

Edge cases:
- `data.length === 0` → render nothing (return null from the sparkline)
- `data.length === 1` → single point at center
- All values equal → flat line at y=10

## 4. Dark mode

- Sparkline colors: `dark:text-primary-400` etc. (already in the color map above)
- Card surface: `dark:bg-surface-800` (slate-800 = `#1e293b`)
- Border: `dark:border-surface-700/60` (slate-700 with 60% opacity)
- Title text: `dark:text-surface-400` (slate-400)
- Value text: `dark:text-white`

## 5. Reduced motion

- The hover lift on `.card-modern-interactive` is wrapped with `motion-reduce:hover:translate-y-0`
- The shadow-glow transition is `motion-reduce:transition-none` so it doesn't fade
- No entrance animations on sparkline (static)
- No entrance animations on KPI cards (we keep `fade-in` and `slide-up` available but don't apply them here)

## 6. Backward compatibility

- `MetricCard`'s new props are required (no defaults). The only call site is `Dashboard.tsx` which we update in the same change.
- `useMonthlyTrend` is exported as a named export from `useFinancialMetrics.ts`. No other consumers.
- `.card-modern` is additive (new class, doesn't break `.card`).
- `shadow-glow` is additive (new token, doesn't break `shadow-soft` or `shadow-card`).
- `MainLayout.astro` removes the old non-inline `<script>` block; the inline version has the same behavior.

## 7. Testing strategy

This change has no unit tests (the project doesn't have a test suite beyond the SDD spec scenarios). Verification is by:
1. `npm run build` passes
2. Manual visual check after deploy
3. SPEC.md requirements traced 1:1 to visual elements (each REQ is verifiable by looking at the dashboard)

## 8. Migration / rollout

- Single commit, single deploy
- No DB migration, no data migration
- No breaking API changes
- Safe to roll back by reverting the single commit
