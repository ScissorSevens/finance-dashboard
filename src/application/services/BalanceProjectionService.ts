/**
 * Balance Projection Service
 * Calculates financial projections and metrics
 */

import type { Transaction } from '../../domain/entities/Transaction';
import type { Category } from '../../domain/entities/Category';
import { CategoryLabels, CategoryColors } from '../../domain/entities/Transaction';

/**
 * Calculate running balance over time
 * Returns arrays of dates and corresponding balances
 */
export function calculateRunningBalance(transactions: Transaction[]): { dates: string[]; balances: number[] } {
  if (transactions.length === 0) {
    return { dates: [], balances: [] };
  }

  // Sort transactions by date
  const sorted = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dates: string[] = [];
  const balances: number[] = [];
  let runningBalance = 0;

  // Group transactions by day and calculate cumulative balance
  for (const tx of sorted) {
    if (tx.type === 'income') {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    dates.push(tx.date);
    balances.push(runningBalance);
  }

  return { dates, balances };
}

/**
 * Calculate daily average spending
 * @param transactions - List of transactions
 * @param days - Window size (default 7)
 */
export function calculateDailyAverage(transactions: Transaction[], days: number = 7): number {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  const recentExpenses = transactions.filter(t => {
    const txDate = new Date(t.date);
    return t.type === 'expense' && txDate >= startDate;
  });

  const totalExpenses = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const daysWithData = Math.max(1, days);

  return totalExpenses / daysWithData;
}

/**
 * Calculate projection: days remaining with current balance
 * @param currentBalance - Current balance (income - expenses)
 * @param dailyAverage - Average daily spending
 */
export function calculateProjectionDays(currentBalance: number, dailyAverage: number): { 
  days: number; 
  date: string | null;
  message: string;
} {
  if (dailyAverage <= 0) {
    return { days: 0, date: null, message: 'Sin gastos registrados' };
  }

  if (currentBalance <= 0) {
    return { days: 0, date: null, message: 'Sin fondos restantes' };
  }

  const days = Math.floor(currentBalance / dailyAverage);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + days);

  return {
    days,
    date: projectedDate.toISOString().split('T')[0],
    message: `${days} días restantes`
  };
}

/**
 * Compare current month vs previous month expenses
 */
export function compareMonthlyTotals(transactions: Transaction[]): {
  currentMonth: number;
  previousMonth: number;
  difference: number;
  percentage: number;
  trend: 'up' | 'down' | 'same';
} {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthExpenses = transactions
    .filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && 
             txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const previousMonthExpenses = transactions
    .filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && 
             txDate.getMonth() === prevMonth && 
             txDate.getFullYear() === prevYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const difference = currentMonthExpenses - previousMonthExpenses;
  const percentage = previousMonthExpenses > 0 
    ? (difference / previousMonthExpenses) * 100 
    : 0;

  let trend: 'up' | 'down' | 'same' = 'same';
  if (difference > 0) trend = 'up';
  else if (difference < 0) trend = 'down';

  return {
    currentMonth: currentMonthExpenses,
    previousMonth: previousMonthExpenses,
    difference,
    percentage,
    trend
  };
}

/**
 * Format currency for display
 */
export function formatCurrencyARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

// ============================================================================
// Phase 2: Detailed Projections
// ============================================================================

/**
 * One month of aggregated income/expense/balance data, with a flag indicating
 * whether the entry is a historical actual (false) or a future projection (true).
 */
export interface MonthlyProjection {
  /** Month in `YYYY-MM` format, e.g. `'2026-05'`. */
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  /** True for future months projected from the current rate. */
  isProjected: boolean;
}

/**
 * Per-category expense breakdown with monthly average and days remaining.
 *
 * `daysRemaining` is the projected number of days the current balance will
 * cover at the category's daily spend rate. Returns `0` when there is no
 * spending data for the category or the daily rate is non-positive.
 */
export interface CategoryProjection {
  categoryId: string;
  name: string;
  totalSpent: number;
  avgMonthly: number;
  daysRemaining: number;
}

/**
 * Direction of the monthly expense trend and the rate of change of that trend.
 *
 * - `direction`: 'up' if expenses are growing, 'down' if shrinking, 'stable' otherwise
 * - `momentum`: 'accelerating' if the change itself is speeding up,
 *              'decelerating' if slowing down, 'constant' if roughly linear
 */
export interface TrendAnalysis {
  movingAverage: number;
  direction: 'up' | 'down' | 'stable';
  momentum: 'accelerating' | 'decelerating' | 'constant';
}

/**
 * Aggregate transactions into per-month totals keyed by `YYYY-MM`.
 */
function groupTransactionsByMonth(transactions: Transaction[]): Map<string, { income: number; expense: number }> {
  const buckets = new Map<string, { income: number; expense: number }>();
  for (const tx of transactions) {
    // Transaction.date is `YYYY-MM-DD`; take the first 7 chars for the month bucket.
    const monthKey = tx.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
    const bucket = buckets.get(monthKey) ?? { income: 0, expense: 0 };
    if (tx.type === 'income') bucket.income += tx.amount;
    else bucket.expense += tx.amount;
    buckets.set(monthKey, bucket);
  }
  return buckets;
}

/**
 * Format a `Date` as `YYYY-MM` in the local timezone.
 */
function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Step a `Date` forward by `n` months, returning a new Date set to the 1st of
 * the target month. Handles year rollover (e.g. Nov + 3 months = Feb next year).
 */
function addMonths(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + n, 1);
}

/**
 * Returns the last 3 historical months (actuals) plus `months` future months
 * (projected from the average of the most recent 3 months of data).
 *
 * Total entry count: `3 + months` (defaults to 3, so 6 entries).
 *
 * - Empty transactions → all entries have zero totals; future entries are still
 *   marked `isProjected: true`.
 * - The "current rate" for projections is the average income/expense of the
 *   most recent 3 months that have data; if none exist, the rate is zero.
 */
export function calculateMonthlyProjection(
  transactions: Transaction[],
  months: number = 3
): MonthlyProjection[] {
  const safeMonths = Math.max(0, Math.floor(months));
  const now = new Date();
  const currentMonthKey = formatMonthKey(now);
  const buckets = groupTransactionsByMonth(transactions);

  // The first 3 entries are the 3 months ending with the current month
  // (the current month and the 2 previous ones). All are historical actuals.
  const historical: MonthlyProjection[] = [];
  for (let offset = 2; offset >= 0; offset--) {
    const monthDate = addMonths(now, -offset);
    const key = formatMonthKey(monthDate);
    const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
    historical.push({
      month: key,
      totalIncome: bucket.income,
      totalExpenses: bucket.expense,
      balance: bucket.income - bucket.expense,
      isProjected: false,
    });
  }

  // Determine the "current rate" from the most recent 3 months that have data.
  // If none have data, the rate is zero (projections stay at zero).
  const monthsWithData = historical.filter(
    (m) => m.totalIncome > 0 || m.totalExpenses > 0
  );
  const recentSlice = monthsWithData.slice(-3);
  const avgIncome = recentSlice.length > 0
    ? recentSlice.reduce((s, m) => s + m.totalIncome, 0) / recentSlice.length
    : 0;
  const avgExpense = recentSlice.length > 0
    ? recentSlice.reduce((s, m) => s + m.totalExpenses, 0) / recentSlice.length
    : 0;

  // The next `safeMonths` entries are projections starting the month after the
  // current month, applying the current rate.
  const projected: MonthlyProjection[] = [];
  for (let offset = 1; offset <= safeMonths; offset++) {
    const monthDate = addMonths(now, offset);
    const key = formatMonthKey(monthDate);
    projected.push({
      month: key,
      totalIncome: avgIncome,
      totalExpenses: avgExpense,
      balance: avgIncome - avgExpense,
      isProjected: true,
    });
  }

  // Avoid an empty result: when safeMonths is 0 we still return the 3 historical
  // entries (useful for the chart which can still render actuals-only).
  void currentMonthKey; // documented to make the "current month" semantics obvious
  return [...historical, ...projected];
}

/**
 * Returns per-expense-category projections: total spent, monthly average, and
 * days the current balance would last at the category's daily spend rate.
 *
 * Includes ALL expense categories passed in, even those with zero spending
 * (in that case `totalSpent`/`avgMonthly` are 0 and `daysRemaining` is 0).
 */
export function calculateCategoryProjections(
  transactions: Transaction[],
  categories: Category[],
  currentBalance: number
): CategoryProjection[] {
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Determine the number of distinct historical months the data spans.
  // Used as the divisor for `avgMonthly` so a category that only spent in 1
  // month has a higher monthly average than one that spent across many.
  const monthKeys = new Set<string>();
  for (const tx of transactions) {
    if (tx.type === 'expense') monthKeys.add(tx.date.slice(0, 7));
  }
  const monthsSpan = Math.max(1, monthKeys.size);

  // Determine the day-of-month of the most recent expense, used as the anchor
  // for `daysRemaining` (i.e. how many more days in the current spending cycle
  // would the current balance cover at this category's average rate).
  const now = new Date();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemainingInMonth = Math.max(1, daysInCurrentMonth - dayOfMonth + 1);

  return expenseCategories.map((category) => {
    const categoryExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.category === category.name
    );
    const totalSpent = categoryExpenses.reduce((s, t) => s + t.amount, 0);
    const avgMonthly = totalSpent / monthsSpan;
    const avgDaily = avgMonthly / 30;

    let daysRemaining: number;
    if (avgDaily <= 0 || currentBalance <= 0) {
      daysRemaining = 0;
    } else {
      // Days the current balance would cover at the category's daily rate,
      // bounded by the days left in the current month for interpretability.
      const raw = Math.floor(currentBalance / avgDaily);
      daysRemaining = Math.min(raw, daysRemainingInMonth);
    }

    return {
      categoryId: category.id,
      name: category.name,
      totalSpent,
      avgMonthly,
      daysRemaining,
    };
  });
}

/**
 * Compute the direction and momentum of the monthly expense trend.
 *
 * - `window` = how many recent months of data to consider (default 3)
 * - Returns `null` when there are fewer than 2 months of expense data
 *   (per spec scenario: "Insufficient data")
 *
 * `direction` is computed from the first-vs-last delta in the window:
 * - delta > 0  → 'up' (expenses growing)
 * - delta < 0  → 'down' (expenses shrinking)
 * - |delta| / avg < 0.05 → 'stable' (within 5% of the average)
 *
 * `momentum` is computed from the second-difference of the series:
 * - second-diff > 0 → 'accelerating' (the deltas themselves are growing)
 * - second-diff < 0 → 'decelerating'
 * - otherwise       → 'constant'
 */
export function calculateTrendAnalysis(
  transactions: Transaction[],
  window: number = 3
): TrendAnalysis | null {
  const safeWindow = Math.max(2, Math.floor(window));
  const buckets = groupTransactionsByMonth(transactions);

  // Take the last `safeWindow` months ending at the current month.
  const now = new Date();
  const series: number[] = [];
  for (let offset = safeWindow - 1; offset >= 0; offset--) {
    const key = formatMonthKey(addMonths(now, -offset));
    const bucket = buckets.get(key);
    series.push(bucket ? bucket.expense : 0);
  }

  // Count months with actual data.
  const monthsWithData = series.filter((v) => v > 0).length;
  if (monthsWithData < 2) {
    return null;
  }

  // Moving average over the window.
  const movingAverage = series.reduce((s, v) => s + v, 0) / series.length;

  // Direction from the delta between last and first month in the window.
  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;
  const baseline = Math.max(Math.abs(first), Math.abs(last), 1);
  const relativeDelta = Math.abs(delta) / baseline;

  let direction: TrendAnalysis['direction'];
  if (relativeDelta < 0.05) {
    direction = 'stable';
  } else if (delta > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  // Momentum from the second difference (avg of the last half minus the first half).
  // Positive → deltas are increasing (accelerating); negative → decreasing (decelerating).
  const half = Math.floor(series.length / 2);
  let momentum: TrendAnalysis['momentum'] = 'constant';
  if (half >= 1) {
    const firstHalfAvg = series.slice(0, half).reduce((s, v) => s + v, 0) / half;
    const secondHalfAvg = series.slice(half).reduce((s, v) => s + v, 0) / (series.length - half);
    const momentumDelta = secondHalfAvg - firstHalfAvg;
    const momentumBaseline = Math.max(Math.abs(firstHalfAvg), Math.abs(secondHalfAvg), 1);
    if (Math.abs(momentumDelta) / momentumBaseline >= 0.05) {
      momentum = momentumDelta > 0 ? 'accelerating' : 'decelerating';
    }
  }

  return { movingAverage, direction, momentum };
}

/**
 * Resolve a human-readable display name for a category projection entry.
 *
 * - Default expense categories use the existing `CategoryLabels` map (Spanish labels).
 * - Custom categories use their stored `name` directly.
 * - Falls back to the raw name if no label is found.
 */
export function getCategoryDisplayName(categoryName: string): string {
  return (CategoryLabels as Record<string, string>)[categoryName] ?? categoryName;
}

/**
 * Resolve a chart color for a category projection entry.
 *
 * - Default categories use the existing `CategoryColors` map.
 * - Custom categories fall back to a neutral gray.
 */
export function getCategoryDisplayColor(categoryName: string): string {
  return (CategoryColors as Record<string, string>)[categoryName] ?? '#6b7280';
}