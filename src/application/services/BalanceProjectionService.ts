/**
 * Balance Projection Service
 * Calculates financial projections and metrics
 */

import type { Transaction } from '../../domain/entities/Transaction';

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