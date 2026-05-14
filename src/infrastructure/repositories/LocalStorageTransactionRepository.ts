import { v4 as uuidv4 } from 'uuid';
import type { Transaction } from '../../domain/entities/Transaction';
import type { TransactionRepository } from '../../domain/repositories/TransactionRepository';

const STORAGE_KEY = 'finance-dashboard-transactions';

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
	constructor(
		message: string,
		public readonly operation: 'read' | 'write' | 'delete' | 'parse',
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'StorageError';
	}
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
	try {
		const test = '__storage_test__';
		localStorage.setItem(test, test);
		localStorage.removeItem(test);
		return true;
	} catch {
		return false;
	}
}

/**
 * Serialize transactions for storage
 */
function serialize(transactions: Transaction[]): string {
	return JSON.stringify(transactions);
}

/**
 * Deserialize transactions from storage
 */
function deserialize(data: string): Transaction[] {
	if (!data) return [];
	try {
		const parsed = JSON.parse(data);
		if (!Array.isArray(parsed)) {
			throw new StorageError('Invalid data format: expected array', 'parse');
		}
		return parsed as Transaction[];
	} catch (error) {
		if (error instanceof StorageError) throw error;
		throw new StorageError('Failed to parse transactions', 'parse', error as Error);
	}
}

/**
 * Get all transactions from storage
 */
function getAllFromStorage(): Transaction[] {
	if (!isStorageAvailable()) {
		console.warn('localStorage not available, using in-memory fallback');
		return [];
	}

	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return deserialize(data || '');
	} catch (error) {
		if (error instanceof StorageError) {
			throw error;
		}
		throw new StorageError('Failed to read transactions', 'read', error as Error);
	}
}

/**
 * Save all transactions to storage
 */
function saveAllToStorage(transactions: Transaction[]): void {
	if (!isStorageAvailable()) {
		console.warn('localStorage not available, changes will not persist');
		return;
	}

	try {
		localStorage.setItem(STORAGE_KEY, serialize(transactions));
	} catch (error) {
		throw new StorageError('Failed to save transactions', 'write', error as Error);
	}
}

/**
 * In-memory fallback storage when localStorage is not available
 */
let memoryStorage: Transaction[] = [];

/**
 * LocalStorage implementation of TransactionRepository
 */
export class LocalStorageTransactionRepository implements TransactionRepository {
	async getAll(): Promise<Transaction[]> {
		if (isStorageAvailable()) {
			return getAllFromStorage();
		}
		return [...memoryStorage];
	}

	async getById(id: string): Promise<Transaction | null> {
		const transactions = await this.getAll();
		return transactions.find((t) => t.id === id) || null;
	}

	async create(
		transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Transaction> {
		const now = new Date().toISOString();
		const newTransaction: Transaction = {
			...transaction,
			id: uuidv4(),
			createdAt: now,
			updatedAt: now,
		};

		if (isStorageAvailable()) {
			const transactions = await this.getAll();
			transactions.push(newTransaction);
			saveAllToStorage(transactions);
		} else {
			memoryStorage.push(newTransaction);
		}

		return newTransaction;
	}

	async update(
		id: string,
		transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>
	): Promise<Transaction | null> {
		const transactions = await this.getAll();
		const index = transactions.findIndex((t) => t.id === id);

		if (index === -1) {
			return null;
		}

		const updated: Transaction = {
			...transactions[index],
			...transaction,
			updatedAt: new Date().toISOString(),
		};

		transactions[index] = updated;

		if (isStorageAvailable()) {
			saveAllToStorage(transactions);
		} else {
			memoryStorage = transactions;
		}

		return updated;
	}

	async delete(id: string): Promise<boolean> {
		const transactions = await this.getAll();
		const filtered = transactions.filter((t) => t.id !== id);

		if (filtered.length === transactions.length) {
			return false;
		}

		if (isStorageAvailable()) {
			saveAllToStorage(filtered);
		} else {
			memoryStorage = filtered;
		}

		return true;
	}

	async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
		const transactions = await this.getAll();
		return transactions.filter((t) => t.date >= startDate && t.date <= endDate);
	}

	async getByType(type: 'income' | 'expense'): Promise<Transaction[]> {
		const transactions = await this.getAll();
		return transactions.filter((t) => t.type === type);
	}
}

/**
 * Singleton instance of the repository
 */
export const transactionRepository = new LocalStorageTransactionRepository();