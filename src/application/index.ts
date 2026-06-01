// Application exports
export { transactionService, TransactionService } from './services/TransactionService';
export {
	calculateMetrics,
	getExpenseBreakdown,
	getIncomeBreakdown,
	getCurrentMonthTransactions,
	getMonthlyTrend,
} from './services/MetricsService';
export type { FinancialMetrics, CategoryBreakdown } from './services/MetricsService';
export { useTransactions } from './hooks/useTransactions';
export { useAuth } from './hooks/useAuth';
export type { UseAuthResult } from './hooks/useAuth';
export {
	categoryService,
	CategoryService,
	DefaultCategoryProtectedError,
	CategoryValidationError,
} from './services/CategoryService';
export {
	SPANISH_TO_ENGLISH,
	translateCategoryKey,
	isSpanishKey,
	migrateTransactions,
	runMigration,
} from './services/SpanishKeyMigration';
export { useCategories } from './hooks/useCategories';
export { createMigrationService, getMigrationService, MigrationService, MigrationError } from './services/MigrationService';
export type { MigrationState, MigrationProgress } from './services/MigrationService';
