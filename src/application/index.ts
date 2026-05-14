// Application exports
export { transactionService, TransactionService } from './services/TransactionService';
export { calculateMetrics, getExpenseBreakdown, getIncomeBreakdown, getCurrentMonthTransactions, getMonthlyTrend } from './services/MetricsService';
export type { FinancialMetrics, CategoryBreakdown } from './services/MetricsService';
export { useTransactions } from './hooks/useTransactions';