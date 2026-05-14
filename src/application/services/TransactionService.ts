import { transactionRepository } from '../../infrastructure/repositories/LocalStorageTransactionRepository';
import type { Transaction, TransactionType, TransactionCategory } from '../../domain/entities/Transaction';

/**
 * Service layer for transaction operations
 * Implements business logic and orchestrates repository calls
 */
export class TransactionService {
	/**
	 * Get all transactions, optionally filtered by type
	 */
	async getTransactions(type?: TransactionType): Promise<Transaction[]> {
		if (type) {
			return transactionRepository.getByType(type);
		}
		return transactionRepository.getAll();
	}

	/**
	 * Get a single transaction by ID
	 */
	async getTransaction(id: string): Promise<Transaction | null> {
		return transactionRepository.getById(id);
	}

	/**
	 * Create a new transaction
	 */
	async createTransaction(data: {
		amount: number;
		type: TransactionType;
		category: TransactionCategory;
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

		return transactionRepository.create({
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
			category: TransactionCategory;
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

		return transactionRepository.update(id, data);
	}

	/**
	 * Delete a transaction
	 */
	async deleteTransaction(id: string): Promise<boolean> {
		return transactionRepository.delete(id);
	}

	/**
	 * Get transactions for a specific month
	 */
	async getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
		const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
		const lastDay = new Date(year, month, 0).getDate();
		const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

		return transactionRepository.getByDateRange(startDate, endDate);
	}
}

/**
 * Singleton instance of the service
 */
export const transactionService = new TransactionService();