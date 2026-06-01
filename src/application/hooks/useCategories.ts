import { signal, computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { Category, CategoryInput, CategoryType } from '../../domain/entities/Category';
import {
	CategoryService,
	DefaultCategoryProtectedError,
	CategoryValidationError,
} from '../services/CategoryService';
import { useAuth } from './useAuth';
import { createStorageProvider } from '../../infrastructure/repositories/StorageProvider';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';

/**
 * Module-level signals backing the hook.
 * Using module-level state (rather than per-component state) lets multiple
 * components share the same reactive category list — the same pattern
 * used by `useTransactions`.
 */
const categories = signal<Category[]>([]);
const isLoading = signal(false);
const error = signal<string | null>(null);
const filterType = signal<CategoryType | 'all'>('all');

/**
 * Computed: categories filtered by the current type filter.
 */
const filteredCategories = computed(() => {
	const t = filterType.value;
	if (t === 'all') return categories.value;
	return categories.value.filter((c) => c.type === t);
});

/**
 * Hook for managing categories with Preact Signals.
 *
 * Returns:
 * - `categories` (computed signal): all categories, filtered by current type filter
 * - `allCategories` (signal): unfiltered list (for cross-type lookups)
 * - `isLoading` (signal): true while a CRUD operation is in flight
 * - `error` (signal): last error message, or null
 * - `filterType` (signal): current type filter
 * - `addCategory`, `updateCategory`, `deleteCategory`: CRUD actions
 * - `loadCategories`, `setFilterType`: helpers
 */
export function useCategories() {
	const { userId, clerkJwt, isLoaded, isSignedIn } = useAuth();

	/**
	 * Build a CategoryService wrapping a repo chosen by the
	 * StorageProvider based on the current auth context.
	 */
	const buildService = (): CategoryService => {
		const provider = createStorageProvider();
		const repo: CategoryRepository = provider.getCategoryRepository({ userId, clerkJwt });
		return new CategoryService(repo);
	};

	/**
	 * Load all categories from the active backend (and seed defaults on first load).
	 */
	const loadCategories = async () => {
		isLoading.value = true;
		error.value = null;
		try {
			const service = buildService();
			const data = await service.getAll();
			categories.value = data;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar categorías';
			console.error('Failed to load categories:', e);
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Create a new category and append it to the in-memory list.
	 */
	const addCategory = async (input: CategoryInput): Promise<Category> => {
		isLoading.value = true;
		error.value = null;
		try {
			const service = buildService();
			const created = await service.add(input);
			categories.value = [...categories.value, created].sort((a, b) => {
				if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
				return a.name.localeCompare(b.name);
			});
			return created;
		} catch (e) {
			error.value = translateError(e);
			throw e;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Update an existing category in place.
	 */
	const updateCategory = async (
		id: string,
		changes: Partial<CategoryInput>
	): Promise<Category | null> => {
		isLoading.value = true;
		error.value = null;
		try {
			const service = buildService();
			const updated = await service.update(id, changes);
			if (updated) {
				categories.value = categories.value.map((c) => (c.id === id ? updated : c));
			}
			return updated;
		} catch (e) {
			error.value = translateError(e);
			throw e;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Delete a category. Rejects deletion of default categories with a
	 * domain-specific error.
	 */
	const deleteCategory = async (id: string): Promise<boolean> => {
		isLoading.value = true;
		error.value = null;
		try {
			const service = buildService();
			const ok = await service.remove(id);
			if (ok) {
				categories.value = categories.value.filter((c) => c.id !== id);
			}
			return ok;
		} catch (e) {
			error.value = translateError(e);
			throw e;
		} finally {
			isLoading.value = false;
		}
	};

	const setFilterType = (type: CategoryType | 'all') => {
		filterType.value = type;
	};

	// Load categories when auth state is resolved. Depends on userId /
	// clerkJwt so account switching triggers a reload.
	useEffect(() => {
		if (!isLoaded) return;
		// Wipe the in-memory list whenever the identity changes. Otherwise
		// a freshly signed-in user could see a flash of the previous
		// user's categories while the next loadCategories() is in flight.
		categories.value = [];
		void loadCategories();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoaded, userId, clerkJwt, isSignedIn]);

	return {
		// State
		categories: filteredCategories,
		allCategories: categories,
		isLoading,
		error,
		filterType,

		// Actions
		loadCategories,
		addCategory,
		updateCategory,
		deleteCategory,
		setFilterType,

		// Derived
		isAuthResolved: isLoaded,
		isAuthenticated: isSignedIn,
	};
}

/**
 * Translate a service-layer error into a user-friendly Spanish message.
 */
function translateError(e: unknown): string {
	if (e instanceof DefaultCategoryProtectedError) {
		return e.message;
	}
	if (e instanceof CategoryValidationError) {
		return e.message;
	}
	if (e instanceof Error) return e.message;
	return 'Error desconocido al gestionar categorías';
}
