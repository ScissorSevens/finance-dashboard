import type { Transaction } from '../../domain/entities/Transaction';
import type { Category } from '../../domain/entities/Category';

/**
 * Spanish → English key migration for transaction category strings.
 *
 * Before Phase 1, the TransactionForm used hardcoded Spanish category
 * names ('Alimentación', 'Transporte', 'Servicios', ...) and saved them
 * verbatim into the `Transaction.category` field. The domain `TransactionCategory`
 * type, however, expects English keys ('food', 'transport', 'utilities', ...).
 *
 * This service rewrites existing transactions on app boot so that
 * `Transaction.category` matches the English keys used by the domain
 * layer and the new `Category` entity.
 *
 * Spec scenarios covered:
 * - Spanish keys detected → mapped to English keys
 * - No Spanish keys → no changes
 * - Unknown Spanish key → falls back to 'other_expense' (or 'other_income')
 */
export const SPANISH_TO_ENGLISH: Record<string, string> = {
	// Expense mappings
	Alimentación: 'food',
	Comida: 'food',
	Supermercado: 'food',
	Restaurante: 'food',
	Transporte: 'transport',
	Taxi: 'transport',
	Colectivo: 'transport',
	Subte: 'transport',
	Nafta: 'transport',
	Servicios: 'utilities',
	Luz: 'utilities',
	Agua: 'utilities',
	Gas: 'utilities',
	Internet: 'utilities',
	Teléfono: 'utilities',
	Alquiler: 'housing',
	Housing: 'housing',
	Vivienda: 'housing',
	Entretenimiento: 'entertainment',
	Ocio: 'entertainment',
	Salida: 'entertainment',
	Salud: 'health',
	Médico: 'health',
	Medicina: 'health',
	Educación: 'education',
	Cursos: 'education',
	Libros: 'education',
	Compras: 'shopping',
	Ropa: 'shopping',
	// Income mappings
	Salario: 'salary',
	Sueldo: 'salary',
	Freelance: 'freelance',
	Inversión: 'investment',
	Inversiones: 'investment',
	Regalo: 'gift',
	Regalos: 'gift',
};

/**
 * Translate a single transaction category string.
 * Returns the English key if found in the map, otherwise returns the input
 * unchanged. For unknown Spanish-looking categories, falls back to
 * 'other_expense' (the safest default since most legacy data is expenses).
 */
export function translateCategoryKey(
	spanishKey: string,
	type: 'income' | 'expense' = 'expense'
): string {
	const trimmed = spanishKey.trim();
	if (SPANISH_TO_ENGLISH[trimmed]) {
		return SPANISH_TO_ENGLISH[trimmed];
	}
	// Unknown key → safe default per spec scenario
	return type === 'income' ? 'other_income' : 'other_expense';
}

/**
 * Detect whether a category string looks like Spanish (i.e. not in the
 * English key set used by the domain `TransactionCategory` union).
 */
const ENGLISH_KEYS = new Set([
	'salary',
	'freelance',
	'investment',
	'gift',
	'other_income',
	'food',
	'transport',
	'housing',
	'utilities',
	'entertainment',
	'health',
	'education',
	'shopping',
	'other_expense',
]);

export function isSpanishKey(key: string): boolean {
	return !ENGLISH_KEYS.has(key.trim());
}

/**
 * Migrate a batch of transactions, rewriting any Spanish category strings
 * to their English equivalents. Returns a new array; the input is not mutated.
 *
 * The provided `persister` callback is invoked only when at least one
 * transaction was rewritten, so the caller can decide how to commit the
 * change (e.g. write to localStorage, send to Supabase).
 */
export function migrateTransactions(
	transactions: Transaction[]
): { migrated: Transaction[]; changed: number } {
	let changed = 0;
	const migrated = transactions.map((tx) => {
		if (!isSpanishKey(tx.category)) {
			return tx;
		}
		const newKey = translateCategoryKey(tx.category, tx.type);
		if (newKey !== tx.category) {
			changed++;
			return { ...tx, category: newKey };
		}
		return tx;
	});
	return { migrated, changed };
}

/**
 * Migration result metadata for logging and debugging.
 */
export interface MigrationResult {
	scannedCount: number;
	changedCount: number;
	unknownKeys: string[];
}

/**
 * Convenience helper: detect Spanish keys present in the dataset, run the
 * migration, and collect stats. Does NOT persist — the caller decides where
 * to write the result (localStorage, Supabase, etc.).
 */
export function runMigration(transactions: Transaction[]): {
	transactions: Transaction[];
	result: MigrationResult;
} {
	const unknownKeys = new Set<string>();
	for (const tx of transactions) {
		if (isSpanishKey(tx.category)) {
			const translated = translateCategoryKey(tx.category, tx.type);
			if (translated === tx.category || translated === 'other_expense' || translated === 'other_income') {
				// The translation may have failed — record the original key
				// for observability. Only record keys that were NOT found in
				// the explicit SPANISH_TO_ENGLISH map.
				if (!SPANISH_TO_ENGLISH[tx.category.trim()]) {
					unknownKeys.add(tx.category);
				}
			}
		}
	}
	const { migrated, changed } = migrateTransactions(transactions);
	return {
		transactions: migrated,
		result: {
			scannedCount: transactions.length,
			changedCount: changed,
			unknownKeys: Array.from(unknownKeys),
		},
	};
}

/**
 * Read-only list of available categories for use in dropdowns and forms.
 * Combines the migrated transactions (data-driven) with the static
 * category list. Returns the names of categories that have at least one
 * associated transaction.
 */
export function getActiveCategoryNames(transactions: Transaction[], categories: Category[]): string[] {
	const used = new Set(transactions.map((t) => t.category));
	return categories.filter((c) => used.has(c.name)).map((c) => c.name);
}
