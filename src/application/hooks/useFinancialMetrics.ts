import { useMemo } from 'preact/hooks';
import type { Transaction } from '../../domain/entities/Transaction';
import {
  calculateRunningBalance,
  calculateDailyAverage,
  calculateProjectionDays,
  compareMonthlyTotals
} from '../services/BalanceProjectionService';

export interface FinancialMetrics {
  runningBalance: { dates: string[]; balances: number[] };
  dailyAverage: number;
  projection: { days: number; date: string | null; message: string };
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    difference: number;
    percentage: number;
    trend: 'up' | 'down' | 'same';
  };
}

export function useFinancialMetrics(transactions: Transaction[], currentBalance: number): FinancialMetrics {
  return useMemo(() => {
    // Calculate running balance
    const runningBalance = calculateRunningBalance(transactions);

    // Calculate daily average (last 7 days)
    const dailyAverage = calculateDailyAverage(transactions, 7);

    // Calculate projection
    const projection = calculateProjectionDays(currentBalance, dailyAverage);

    // Monthly comparison
    const monthlyComparison = compareMonthlyTotals(transactions);

    return {
      runningBalance,
      dailyAverage,
      projection,
      monthlyComparison
    };
  }, [transactions, currentBalance]);
}

/**
 * Trend data for the modernized KPI cards.
 * Buckets transactions by local calendar month, sums the relevant metric,
 * and returns the last `lookbackMonths` buckets zero-padded.
 */
export type TrendMetric = 'balance' | 'income' | 'expense';
export interface MonthlyTrend {
  /** 6 trailing months, oldest → newest. */
  series: number[];
  /** MoM % change; null when there's no prior month to compare. */
  changePct: number | null;
  /** Raw sign of (current - previous); UI applies metric-specific semantics. */
  direction: 'up' | 'down' | 'flat';
}

/**
 * Compute monthly trend data for a single metric.
 *
 * For 'balance': each bucket is the net flow (income - expenses) for that month.
 * For 'income':  each bucket is the total of income transactions for that month.
 * For 'expense': each bucket is the total of expense transactions for that month.
 *
 * Zero-pads leading buckets if the user has fewer than `lookbackMonths` of
 * history, so the sparkline always has the requested number of points.
 */
export function useMonthlyTrend(
  transactions: Transaction[],
  metric: TrendMetric,
  lookbackMonths = 6
): MonthlyTrend {
  return useMemo(() => {
    const now = new Date();
    const buckets: { key: string; total: number }[] = [];

    // Build `lookbackMonths` zero-initialized buckets ending with the current month.
    for (let i = lookbackMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, total: 0 });
    }
    const keyToIndex = new Map(buckets.map((b, i) => [b.key, i]));

    // Aggregate transactions into the appropriate buckets.
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const idx = keyToIndex.get(key);
      if (idx === undefined) continue;
      if (metric === 'income' && t.type !== 'income') continue;
      if (metric === 'expense' && t.type !== 'expense') continue;
      if (metric === 'balance') {
        buckets[idx].total += t.type === 'income' ? t.amount : -t.amount;
      } else {
        buckets[idx].total += t.amount;
      }
    }

    const series = buckets.map((b) => b.total);
    const current = series[series.length - 1];
    const previous = series[series.length - 2];

    let changePct: number | null = null;
    let direction: 'up' | 'down' | 'flat' = 'flat';
    if (previous !== undefined) {
      if (previous === 0) {
        changePct = current === 0 ? 0 : null;
        direction = current === 0 ? 'flat' : current > 0 ? 'up' : 'down';
      } else {
        changePct = ((current - previous) / Math.abs(previous)) * 100;
        const diff = current - previous;
        direction = Math.abs(diff) < 0.005 ? 'flat' : diff > 0 ? 'up' : 'down';
      }
    }

    return { series, changePct, direction };
  }, [transactions, metric, lookbackMonths]);
}