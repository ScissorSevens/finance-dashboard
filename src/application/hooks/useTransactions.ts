import { signal, computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { Transaction, TransactionType, TransactionCategory } from '../../domain/entities/Transaction';
import { transactionService } from '../services/TransactionService';

/**
 * Signal state for transactions
 */
const transactions = signal<Transaction[]>([]);
const isLoading = signal(false);
const error = signal<string | null>(null);
const filterType = signal<TransactionType | 'all'>('all');
const filterCategory = signal<TransactionCategory | 'all'>('all');
const searchQuery = signal('');

/**
 * Computed filtered transactions
 */
const filteredTransactions = computed(() => {
	let result = transactions.value;

	// Filter by type
	if (filterType.value !== 'all') {
		result = result.filter((t) => t.type === filterType.value);
	}

	// Filter by category
	if (filterCategory.value !== 'all') {
		result = result.filter((t) => t.category === filterCategory.value);
	}

	// Filter by search query
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase();
		result = result.filter(
			(t) =>
				t.description.toLowerCase().includes(query) ||
				t.category.toLowerCase().includes(query)
		);
	}

	// Sort by date descending (newest first)
	return result.sort((a, b) => b.date.localeCompare(a.date));
});

/**
 * Computed totals
 */
const totals = computed(() => {
	const txs = transactions.value;
	const income = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
	const expense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
	const balance = income - expense;

	return { income, expense, balance };
});

/**
 * Hook for managing transactions with Preact Signals
 */
export function useTransactions() {
	/**
	 * Load all transactions from storage
	 */
	const loadTransactions = async () => {
		isLoading.value = true;
		error.value = null;

		try {
			const data = await transactionService.getTransactions();
			transactions.value = data;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar transacciones';
			console.error('Failed to load transactions:', e);
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Add a new transaction
	 */
	const addTransaction = async (data: {
		amount: number;
		type: TransactionType;
		category: TransactionCategory;
		description: string;
		date: string;
	}) => {
		isLoading.value = true;
		error.value = null;

		try {
			const newTransaction = await transactionService.createTransaction(data);
			transactions.value = [...transactions.value, newTransaction];
			return newTransaction;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al crear transacción';
			throw e;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Update an existing transaction
	 */
	const updateTransaction = async (
		id: string,
		data: Partial<{
			amount: number;
			type: TransactionType;
			category: TransactionCategory;
			description: string;
			date: string;
		}>
	) => {
		isLoading.value = true;
		error.value = null;

		try {
			const updated = await transactionService.updateTransaction(id, data);
			if (updated) {
				transactions.value = transactions.value.map((t) => (t.id === id ? updated : t));
			}
			return updated;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al actualizar transacción';
			throw e;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Delete a transaction
	 */
	const deleteTransaction = async (id: string) => {
		isLoading.value = true;
		error.value = null;

		try {
			const success = await transactionService.deleteTransaction(id);
			if (success) {
				transactions.value = transactions.value.filter((t) => t.id !== id);
			}
			return success;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al eliminar transacción';
			throw e;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Set type filter
	 */
	const setFilterType = (type: TransactionType | 'all') => {
		filterType.value = type;
	};

	/**
	 * Set category filter
	 */
	const setFilterCategory = (category: TransactionCategory | 'all') => {
		filterCategory.value = category;
	};

	/**
	 * Set search query
	 */
	const setSearchQuery = (query: string) => {
		searchQuery.value = query;
	};

	/**
	 * Clear all filters
	 */
	const clearFilters = () => {
		filterType.value = 'all';
		filterCategory.value = 'all';
		searchQuery.value = '';
	};

	// Load transactions on mount
	useEffect(() => {
		loadTransactions();
	}, []);

	return {
		// State
		transactions: filteredTransactions,
		allTransactions: transactions,
		isLoading,
		error,
		filterType,
		filterCategory,
		searchQuery,
		totals,

		// Actions
		loadTransactions,
		addTransaction,
		updateTransaction,
		deleteTransaction,
		setFilterType,
		setFilterCategory,
		setSearchQuery,
		clearFilters,
	};
}