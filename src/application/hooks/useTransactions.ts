import { signal, computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { Transaction, TransactionType } from '../../domain/entities/Transaction';
import { TransactionService } from '../services/TransactionService';
import { useAuth } from './useAuth';
import { createStorageProvider } from '../../infrastructure/repositories/StorageProvider';
import type { TransactionRepository } from '../../domain/repositories/TransactionRepository';

/**
 * Signal state for transactions
 */
const transactions = signal<Transaction[]>([]);
const isLoading = signal(false);
const error = signal<string | null>(null);
const filterType = signal<TransactionType | 'all'>('all');
const filterCategory = signal<string | 'all'>('all');
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
 * Hook for managing transactions with Preact Signals.
 *
 * Phase 3 update: this hook no longer depends on a hard-coded
 * `transactionRepository` singleton. It reads the current Clerk auth
 * state via `useAuth()`, asks the `StorageProvider` for the right
 * repository, and creates a per-call `TransactionService` wrapping it.
 *
 * Spec scenarios covered:
 * - Authenticated user → Supabase repo → RLS isolates data
 * - Offline / unauthenticated / Supabase down → localStorage repo
 * - Switching accounts → next load picks the new user_id automatically
 */
export function useTransactions() {
	const { userId, clerkJwt, isLoaded, isSignedIn } = useAuth();

	/**
	 * Build a TransactionService wrapping a repo chosen by the
	 * StorageProvider based on the current auth context.
	 */
	const buildService = (): TransactionService => {
		const provider = createStorageProvider();
		const repo: TransactionRepository = provider.getTransactionRepository({ userId, clerkJwt });
		return new TransactionService(repo);
	};

	/**
	 * Load all transactions from the active backend.
	 */
	const loadTransactions = async () => {
		isLoading.value = true;
		error.value = null;

		try {
			const service = buildService();
			const data = await service.getTransactions();
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
		category: string;
		description: string;
		date: string;
	}) => {
		isLoading.value = true;
		error.value = null;

		try {
			const service = buildService();
			const newTransaction = await service.createTransaction(data);
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
			category: string;
			description: string;
			date: string;
		}>
	) => {
		isLoading.value = true;
		error.value = null;

		try {
			const service = buildService();
			const updated = await service.updateTransaction(id, data);
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
			const service = buildService();
			const success = await service.deleteTransaction(id);
			if (success) {
				transactions.value = transactions.value.filter((t) => t.id !== id);
			}
			return success;
		} catch (e)			{
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
	const setFilterCategory = (category: string | 'all') => {
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

	// Load transactions when auth state is resolved. We depend on the
	// `userId` (not `isSignedIn` alone) so that switching Clerk accounts
	// triggers a reload. We also depend on `clerkJwt` so a token refresh
	// picks up the new token.
	useEffect(() => {
		if (!isLoaded) return;
		// Guard: if signed in but JWT not ready yet, skip — same reason as
		// in useCategories: avoids a premature Supabase request with null auth.
		if (isSignedIn && !clerkJwt) return;
		transactions.value = [];
		void loadTransactions();
		// We intentionally do NOT include `loadTransactions` in deps — it's
		// a stable closure that reads the latest auth via `useAuth()`.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoaded, userId, clerkJwt, isSignedIn]);

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

		// Derived
		isAuthResolved: isLoaded,
		isAuthenticated: isSignedIn,
	};
}
