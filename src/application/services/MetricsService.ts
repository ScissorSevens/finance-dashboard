import type { Transaction, TransactionCategory, IncomeCategory, ExpenseCategory } from '../../domain/entities/Transaction';
import { CategoryLabels } from '../../domain/entities/Transaction';

/**
 * Financial metrics calculated from transactions
 */
export interface FinancialMetrics {
	totalIncome: number;
	totalExpense: number;
	balance: number;
	incomeByCategory: Record<IncomeCategory, number>;
	expenseByCategory: Record<ExpenseCategory, number>;
	transactionCount: number;
	averageTransaction: number;
}

/**
 * Chart data for expense breakdown
 */
export interface CategoryBreakdown {
	category: string;
	label: string;
	amount: number;
	percentage: number;
	color: string;
}

/**
 * Calculate financial metrics from transactions
 */
export function calculateMetrics(transactions: Transaction[]): FinancialMetrics {
	const incomeTx = transactions.filter((t) => t.type === 'income');
	const expenseTx = transactions.filter((t) => t.type === 'expense');

	// Total amounts
	const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
	const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
	const balance = totalIncome - totalExpense;

	// Income by category
	const incomeByCategory: Record<IncomeCategory, number> = {
		salary: 0,
		freelance: 0,
		investment: 0,
		gift: 0,
		other_income: 0,
	};

	incomeTx.forEach((t) => {
		const cat = t.category as IncomeCategory;
		if (cat in incomeByCategory) {
			incomeByCategory[cat] += t.amount;
		}
	});

	// Expense by category
	const expenseByCategory: Record<ExpenseCategory, number> = {
		food: 0,
		transport: 0,
		housing: 0,
		utilities: 0,
		entertainment: 0,
		health: 0,
		education: 0,
		shopping: 0,
		other_expense: 0,
	};

	expenseTx.forEach((t) => {
		const cat = t.category as ExpenseCategory;
		if (cat in expenseByCategory) {
			expenseByCategory[cat] += t.amount;
		}
	});

	// Average transaction
	const totalCount = transactions.length;
	const averageTransaction = totalCount > 0 ? (totalIncome + totalExpense) / totalCount : 0;

	return {
		totalIncome,
		totalExpense,
		balance,
		incomeByCategory,
		expenseByCategory,
		transactionCount: totalCount,
		averageTransaction,
	};
}

/**
 * Get expense breakdown for charts (sorted by amount descending)
 */
export function getExpenseBreakdown(
	transactions: Transaction[],
	limit: number = 10
): CategoryBreakdown[] {
	const metrics = calculateMetrics(transactions);
	const expenseCategories = Object.entries(metrics.expenseByCategory)
		.filter(([, amount]) => amount > 0)
		.sort(([, a], [, b]) => b - a)
		.slice(0, limit);

	const totalExpense = metrics.totalExpense;

	return expenseCategories.map(([category, amount]) => ({
		category,
		label: CategoryLabels[category as ExpenseCategory],
		amount,
		percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
		color: getCategoryColor(category),
	}));
}

/**
 * Get income breakdown for charts (sorted by amount descending)
 */
export function getIncomeBreakdown(
	transactions: Transaction[],
	limit: number = 10
): CategoryBreakdown[] {
	const metrics = calculateMetrics(transactions);
	const incomeCategories = Object.entries(metrics.incomeByCategory)
		.filter(([, amount]) => amount > 0)
		.sort(([, a], [, b]) => b - a)
		.slice(0, limit);

	const totalIncome = metrics.totalIncome;

	return incomeCategories.map(([category, amount]) => ({
		category,
		label: CategoryLabels[category as IncomeCategory],
		amount,
		percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
		color: getCategoryColor(category),
	}));
}

/**
 * Get color for category
 */
function getCategoryColor(category: string): string {
	const colors: Record<string, string> = {
		salary: '#10b981',
		freelance: '#34d399',
		investment: '#6ee7b7',
		gift: '#a7f3d0',
		other_income: '#d1fae5',
		food: '#f87171',
		transport: '#fb923c',
		housing: '#f59e0b',
		utilities: '#eab308',
		entertainment: '#a855f7',
		health: '#ec4899',
		education: '#3b82f6',
		shopping: '#6366f1',
		other_expense: '#8b5cf6',
	};

	return colors[category] || '#94a3b8';
}

/**
 * Get transactions for current month
 */
export function getCurrentMonthTransactions(transactions: Transaction[]): Transaction[] {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const prefix = `${year}-${month}`;

	return transactions.filter((t) => t.date.startsWith(prefix));
}

/**
 * Get transactions grouped by month (last N months)
 */
export function getMonthlyTrend(transactions: Transaction[], months: number = 6) {
	const now = new Date();
	const result: { month: string; income: number; expense: number; balance: number }[] = [];

	for (let i = months - 1; i >= 0; i--) {
		const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const prefix = `${year}-${month}`;

		const monthTx = transactions.filter((t) => t.date.startsWith(prefix));
		const income = monthTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
		const expense = monthTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

		result.push({
			month: `${year}-${month}`,
			income,
			expense,
			balance: income - expense,
		});
	}

	return result;
}