import type { TransactionRepository } from '../../domain/repositories/TransactionRepository';
import { transactionRepository as defaultTransactionRepository } from '../../infrastructure/repositories/LocalStorageTransactionRepository';
import type { Transaction, TransactionType } from '../../domain/entities/Transaction';

/**
 * Service layer for transaction operations
 * Implements business logic and orchestrates repository calls.
 *
 * Phase 3 update: the service now accepts the repository via the
 * constructor (dependency injection) so callers can swap in a
 * Supabase-backed repository. The default export below uses the
 * localStorage singleton to keep backward compatibility.
 */
export class TransactionService {
	constructor(private readonly repository: TransactionRepository = defaultTransactionRepository) {}

	/**
	 * Get all transactions, optionally filtered by type
	 */
	async getTransactions(type?: TransactionType): Promise<Transaction[]> {
		if (type) {
			return this.repository.getByType(type);
		}
		return this.repository.getAll();
	}

	/**
	 * Get a single transaction by ID
	 */
	async getTransaction(id: string): Promise<Transaction | null> {
		return this.repository.getById(id);
	}

	/**
	 * Create a new transaction
	 */
	async createTransaction(data: {
		amount: number;
		type: TransactionType;
		category: string;
		description: string;
		date: string;
	}): Promise<Transaction> {
		// Validate amount
		if (data.amount <= 0) {
			throw new Error('El monto debe ser mayor a 0');
		}

		// Validate date format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
			throw new Error('Formato de fecha inválido');
		}

		// Validate description
		if (!data.description.trim()) {
			throw new Error('La descripción es requerida');
		}

		return this.repository.create({
			amount: data.amount,
			type: data.type,
			category: data.category,
			description: data.description.trim(),
			date: data.date,
		});
	}

	/**
	 * Update an existing transaction
	 */
	async updateTransaction(
		id: string,
		data: Partial<{
			amount: number;
			type: TransactionType;
			category: string;
			description: string;
			date: string;
		}>
	): Promise<Transaction | null> {
		// Validate amount if provided
		if (data.amount !== undefined && data.amount <= 0) {
			throw new Error('El monto debe ser mayor a 0');
		}

		// Validate date format if provided
		if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
			throw new Error('Formato de fecha inválido');
		}

		return this.repository.update(id, data);
	}

	/**
	 * Delete a transaction
	 */
	async deleteTransaction(id: string): Promise<boolean> {
		return this.repository.delete(id);
	}

	/**
	 * Get transactions for a specific month
	 */
	async getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
		const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
		const lastDay = new Date(year, month, 0).getDate();
		const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

		return this.repository.getByDateRange(startDate, endDate);
	}

	/**
	 * Bulk insert a batch of transactions. Used by the migration path.
	 */
	async createBulkTransactions(
		transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>,
		userId: string
	): Promise<Transaction[]> {
		return this.repository.createBulk(transactions, userId);
	}
}

/**
 * Default singleton instance of the service, wired to the localStorage
 * repository. Use `new TransactionService(supabaseRepo)` from hooks that
 * have a StorageProvider to swap implementations at runtime.
 */
export const transactionService = new TransactionService();