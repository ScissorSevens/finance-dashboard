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