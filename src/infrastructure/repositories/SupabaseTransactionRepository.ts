import type { SupabaseClient } from '@supabase/supabase-js';
import type { Transaction } from '../../domain/entities/Transaction';
import type { TransactionRepository } from '../../domain/repositories/TransactionRepository';
import { StorageError } from './LocalStorageTransactionRepository';

/**
 * Row shape used by the Supabase `transactions` table. Mirrors the
 * `Category` schema in `supabase/schema.sql`.
 */
interface TransactionRow {
	id: string;
	user_id: string;
	amount: number;
	type: 'income' | 'expense';
	category: string;
	description: string;
	date: string;
	created_at: string;
	updated_at: string;
}

/**
 * Map a Supabase row into the domain `Transaction` entity.
 */
function rowToTransaction(row: TransactionRow): Transaction {
	return {
		id: row.id,
		amount: Number(row.amount),
		type: row.type,
		category: row.category,
		description: row.description,
		date: row.date,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * Supabase implementation of `TransactionRepository`.
 *
 * Design notes:
 * - The repository is constructed with an explicit `userId` (the Clerk
 *   user.id) so that every write can stamp `user_id` correctly. RLS
 *   ensures the user can only see/modify their own rows, but we also
 *   stamp the column to match the spec scenario
 *   "user_id column equals Clerk user.id".
 * - The repository is dumb with respect to auth: it trusts the caller
 *   to pass a valid, authenticated client. The StorageProvider factory
 *   is responsible for wiring up the Clerk JWT.
 * - Network/Postgres errors are rewrapped as `StorageError` so callers
 *   can distinguish storage failures from validation failures.
 *
 * Spec scenarios covered:
 * - Create / Read / Update / Delete transaction
 * - Network failure → graceful error (StorageError with cause)
 * - Atomic createBulk: if any row fails to insert, the entire batch
 *   is rolled back via Supabase's "all-or-nothing" insert semantics
 *   (single round trip; the Postgres engine aborts on first error).
 */
export class SupabaseTransactionRepository implements TransactionRepository {
	constructor(
		private readonly client: SupabaseClient,
		private readonly userId: string
	) {}

	async getAll(): Promise<Transaction[]> {
		const { data, error } = await this.client
			.from('transactions')
			.select('*')
			.eq('user_id', this.userId)
			.order('date', { ascending: false });

		if (error) {
			throw new StorageError(
				`Failed to fetch transactions: ${error.message}`,
				'read',
				new Error(error.message)
			);
		}
		return (data ?? []).map((row) => rowToTransaction(row as TransactionRow));
	}

	async getById(id: string): Promise<Transaction | null> {
		const { data, error } = await this.client
			.from('transactions')
			.select('*')
			.eq('user_id', this.userId)
			.eq('id', id)
			.maybeSingle();

		if (error) {
			throw new StorageError(
				`Failed to fetch transaction ${id}: ${error.message}`,
				'read',
				new Error(error.message)
			);
		}
		return data ? rowToTransaction(data as TransactionRow) : null;
	}

	async create(
		transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Transaction> {
		const { data, error } = await this.client
			.from('transactions')
		.insert({
			user_id: this.userId,
			amount: transaction.amount,
			type: transaction.type,
			category: transaction.category,
			description: transaction.description,
			date: transaction.date,
		})
			.select('*')
			.single();

		if (error || !data) {
			throw new StorageError(
				`Failed to create transaction: ${error?.message ?? 'no row returned'}`,
				'write',
				error ? new Error(error.message) : undefined
			);
		}
		return rowToTransaction(data as TransactionRow);
	}

	async update(
		id: string,
		transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>
	): Promise<Transaction | null> {
		// Build a partial update payload with only the fields the caller
		// actually passed. We don't allow updating `id` or `createdAt`.
		const patch: Record<string, unknown> = {};
		if (transaction.amount !== undefined) patch.amount = transaction.amount;
		if (transaction.type !== undefined) patch.type = transaction.type;
		if (transaction.category !== undefined) patch.category = transaction.category;
		if (transaction.description !== undefined) patch.description = transaction.description;
		if (transaction.date !== undefined) patch.date = transaction.date;

		const { data, error } = await this.client
			.from('transactions')
			.update(patch)
			.eq('user_id', this.userId)
			.eq('id', id)
			.select('*')
			.maybeSingle();

		if (error) {
			throw new StorageError(
				`Failed to update transaction ${id}: ${error.message}`,
				'write',
				new Error(error.message)
			);
		}
		return data ? rowToTransaction(data as TransactionRow) : null;
	}

	async delete(id: string): Promise<boolean> {
		const { error, count } = await this.client
			.from('transactions')
			.delete({ count: 'exact' })
			.eq('user_id', this.userId)
			.eq('id', id);

		if (error) {
			throw new StorageError(
				`Failed to delete transaction ${id}: ${error.message}`,
				'delete',
				new Error(error.message)
			);
		}
		return (count ?? 0) > 0;
	}

	async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
		const { data, error } = await this.client
			.from('transactions')
			.select('*')
			.eq('user_id', this.userId)
			.gte('date', startDate)
			.lte('date', endDate)
			.order('date', { ascending: false });

		if (error) {
			throw new StorageError(
				`Failed to fetch transactions by range: ${error.message}`,
				'read',
				new Error(error.message)
			);
		}
		return (data ?? []).map((row) => rowToTransaction(row as TransactionRow));
	}

	async getByType(type: 'income' | 'expense'): Promise<Transaction[]> {
		const { data, error } = await this.client
			.from('transactions')
			.select('*')
			.eq('user_id', this.userId)
			.eq('type', type)
			.order('date', { ascending: false });

		if (error) {
			throw new StorageError(
				`Failed to fetch transactions by type: ${error.message}`,
				'read',
				new Error(error.message)
			);
		}
		return (data ?? []).map((row) => rowToTransaction(row as TransactionRow));
	}

	/**
	 * Atomic bulk insert for the localStorage → Supabase migration path.
	 *
	 * Strategy: a single `insert` call with an array payload. The Supabase
	 * client serializes the array into a single SQL INSERT with multiple
	 * VALUES tuples; Postgres either commits all rows or none. The
	 * `user_id` column is stamped from the constructor's `userId`.
	 *
	 * On any error, the call returns zero inserted rows. The caller
	 * (MigrationService) treats this as "rollback complete" and the
	 * localStorage copy is preserved per spec.
	 */
	async createBulk(
		transactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>,
		userId: string
	): Promise<Transaction[]> {
		if (transactions.length === 0) return [];

		const payload = transactions.map((t) => ({
			user_id: userId,
			amount: t.amount,
			type: t.type,
			category: t.category,
			description: t.description,
			date: t.date,
		}));

		const { data, error } = await this.client
			.from('transactions')
		.insert(payload)
			.select('*');

		if (error || !data) {
			throw new StorageError(
				`Migration bulk insert failed: ${error?.message ?? 'no rows returned'}`,
				'write',
				error ? new Error(error.message) : undefined
			);
		}
		return (data as TransactionRow[]).map(rowToTransaction);
	}
}
