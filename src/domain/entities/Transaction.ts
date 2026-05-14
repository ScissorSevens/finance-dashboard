/**
 * Core domain entity for financial transactions
 */
export interface Transaction {
	id: string;
	amount: number;
	type: TransactionType;
	category: string;
	description: string;
	date: string; // ISO 8601 format: YYYY-MM-DD
	createdAt: string; // ISO 8601 timestamp
	updatedAt: string; // ISO 8601 timestamp
}

export type TransactionType = 'income' | 'expense';

/**
 * Valid income categories
 */
export type IncomeCategory =
	| 'salary'
	| 'freelance'
	| 'investment'
	| 'gift'
	| 'other_income';

/**
 * Valid expense categories
 */
export type ExpenseCategory =
	| 'food'
	| 'transport'
	| 'housing'
	| 'utilities'
	| 'entertainment'
	| 'health'
	| 'education'
	| 'shopping'
	| 'other_expense';

/**
 * All valid categories combined
 */
export type TransactionCategory = IncomeCategory | ExpenseCategory;

/**
 * Category labels for display
 */
export const CategoryLabels: Record<TransactionCategory, string> = {
	// Income
	salary: 'Salario',
	freelance: 'Freelance',
	investment: 'Inversión',
	gift: 'Regalo',
	other_income: 'Otros ingresos',
	// Expense
	food: 'Comida',
	transport: 'Transporte',
	housing: 'Vivienda',
	utilities: 'Servicios',
	entertainment: 'Entretención',
	health: 'Salud',
	education: 'Educación',
	shopping: 'Compras',
	other_expense: 'Otros gastos',
};

/**
 * Category colors for charts
 */
export const CategoryColors: Record<TransactionCategory, string> = {
	// Income - Green tones
	salary: '#10b981',
	freelance: '#34d399',
	investment: '#6ee7b7',
	gift: '#a7f3d0',
	other_income: '#d1fae5',
	// Expense - Red/Orange tones
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