/**
 * Core domain entity for financial categories
 *
 * The Category entity replaces the previous hardcoded category arrays.
 * Categories are stored separately from transactions and linked by the
 * `name` field (English key) to avoid cascading migrations on existing data.
 *
 * For default categories, `name` is an English slug (e.g. 'food', 'transport')
 * that matches the legacy `TransactionCategory` string union. The Spanish
 * display label is resolved via `CategoryLabels` in `Transaction.ts`.
 *
 * For user-created custom categories, `name` is whatever the user typed
 * (typically Spanish) and IS the display label directly.
 */
export interface Category {
	id: string;
	name: string; // English key for defaults; user-entered for custom
	type: CategoryType;
	color: string; // hex color for charts and UI accents
	icon?: string; // optional icon name (e.g. lucide icon)
	isDefault: boolean; // true for seeded defaults; cannot be deleted
}

export type CategoryType = 'income' | 'expense';

/**
 * Input shape for creating a new category.
 * Repository implementations assign `id` and persist.
 */
export type CategoryInput = Omit<Category, 'id'>;

/**
 * Default categories seeded on first app load when storage is empty.
 * 5 income + 7 expense = 12 defaults.
 *
 * English keys match the legacy `TransactionCategory` union so existing
 * transactions remain valid after migration.
 */
export const DEFAULT_CATEGORIES: CategoryInput[] = [
	// Income (5)
	{ name: 'salary', type: 'income', color: '#10b981', isDefault: true },
	{ name: 'freelance', type: 'income', color: '#34d399', isDefault: true },
	{ name: 'investment', type: 'income', color: '#6ee7b7', isDefault: true },
	{ name: 'gift', type: 'income', color: '#a7f3d0', isDefault: true },
	{ name: 'other_income', type: 'income', color: '#d1fae5', isDefault: true },
	// Expense (7)
	{ name: 'food', type: 'expense', color: '#f87171', isDefault: true },
	{ name: 'transport', type: 'expense', color: '#fb923c', isDefault: true },
	{ name: 'housing', type: 'expense', color: '#f59e0b', isDefault: true },
	{ name: 'utilities', type: 'expense', color: '#eab308', isDefault: true },
	{ name: 'entertainment', type: 'expense', color: '#a855f7', isDefault: true },
	{ name: 'health', type: 'expense', color: '#ec4899', isDefault: true },
	{ name: 'education', type: 'expense', color: '#3b82f6', isDefault: true },
];
