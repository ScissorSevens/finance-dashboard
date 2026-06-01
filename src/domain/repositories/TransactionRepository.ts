import type { Transaction } from '../entities/Transaction';

/**
 * Repository interface for Transaction persistence
 * Following Clean Architecture, this defines the contract that
 * infrastructure layer must implement
 */
export interface TransactionRepository {
	/**
	 * Get all transactions
	 */
	getAll(): Promise<Transaction[]>;

	/**
	 * Get a transaction by ID
	 */
	getById(id: string): Promise<Transaction | null>;

	/**
	 * Create a new transaction
	 */
	create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;

	/**
	 * Update an existing transaction
	 */
	update(id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction | null>;

	/**
	 * Delete a transaction
	 */
	delete(id: string): Promise<boolean>;

	/**
	 * Get transactions within a date range
	 */
	getByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;

	/**
	 * Get transactions by type
	 */
	getByType(type: 'income' | 'expense'): Promise<Transaction[]>;

	/**
	 * Bulk-insert a batch of transactions. Used by the localStorage → cloud
	 * migration path so the entire dataset moves in a single round trip.
	 * Implementations MUST be atomic: on any per-row failure, the entire
	 * batch MUST be rolled back (no partial inserts).
	 *
	 * @param transactions  Entities to insert (the implementation assigns ids).
	 * @param userId        The Clerk user.id; persisted as `user_id`.
	 */
	createBulk(
		transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>,
		userId: string
	): Promise<Transaction[]>;
}