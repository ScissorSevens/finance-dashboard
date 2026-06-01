import { v4 as uuidv4 } from 'uuid';
import type { Category, CategoryInput } from '../../domain/entities/Category';
import { DEFAULT_CATEGORIES } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { StorageError } from './LocalStorageTransactionRepository';

const STORAGE_KEY = 'finance-dashboard-categories';

/**
 * Check if localStorage is available.
 * Duplicated locally to keep this file self-contained and avoid coupling
 * to the transaction repository internals.
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

function serialize(categories: Category[]): string {
	return JSON.stringify(categories);
}

function deserialize(data: string): Category[] {
	if (!data) return [];
	try {
		const parsed = JSON.parse(data);
		if (!Array.isArray(parsed)) {
			throw new StorageError('Invalid categories format: expected array', 'parse');
		}
		return parsed as Category[];
	} catch (error) {
		if (error instanceof StorageError) throw error;
		throw new StorageError('Failed to parse categories', 'parse', error as Error);
	}
}

function getAllFromStorage(): Category[] {
	if (!isStorageAvailable()) {
		return [];
	}
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return deserialize(data || '');
	} catch (error) {
		if (error instanceof StorageError) throw error;
		throw new StorageError('Failed to read categories', 'read', error as Error);
	}
}

function saveAllToStorage(categories: Category[]): void {
	if (!isStorageAvailable()) {
		console.warn('localStorage not available, categories will not persist');
		return;
	}
	try {
		localStorage.setItem(STORAGE_KEY, serialize(categories));
	} catch (error) {
		throw new StorageError('Failed to save categories', 'write', error as Error);
	}
}

/**
 * In-memory fallback for environments where localStorage is unavailable
 * (SSR, private mode, tests).
 */
let memoryStorage: Category[] = [];

/**
 * LocalStorage implementation of CategoryRepository.
 *
 * On the very first read (storage key missing), this repository seeds
 * the canonical set of default categories (5 income + 7 expense) so that
 * the rest of the application can rely on a non-empty list without
 * having to coordinate the seeding itself.
 */
export class LocalStorageCategoryRepository implements CategoryRepository {
	async findAll(): Promise<Category[]> {
		if (isStorageAvailable()) {
			const existing = getAllFromStorage();
			// First-load seeding: storage key missing OR empty array
			if (existing.length === 0) {
				const seeded: Category[] = DEFAULT_CATEGORIES.map((c) => ({
					...c,
					id: uuidv4(),
				}));
				saveAllToStorage(seeded);
				return seeded;
			}
			return existing;
		}
		// In-memory fallback: also seed on first read
		if (memoryStorage.length === 0) {
			memoryStorage = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uuidv4() }));
		}
		return [...memoryStorage];
	}

	async findById(id: string): Promise<Category | null> {
		const categories = await this.findAll();
		return categories.find((c) => c.id === id) || null;
	}

	async save(category: CategoryInput): Promise<Category> {
		const newCategory: Category = {
			...category,
			id: uuidv4(),
		};

		if (isStorageAvailable()) {
			const categories = await this.findAll();
			categories.push(newCategory);
			saveAllToStorage(categories);
		} else {
			memoryStorage.push(newCategory);
		}

		return newCategory;
	}

	async update(id: string, changes: Partial<CategoryInput>): Promise<Category | null> {
		if (isStorageAvailable()) {
			const categories = await this.findAll();
			const index = categories.findIndex((c) => c.id === id);
			if (index === -1) return null;
			const merged: Category = {
				...categories[index],
				...changes,
				id, // never let the id change via update
			};
			categories[index] = merged;
			saveAllToStorage(categories);
			return merged;
		}

		// In-memory fallback
		const index = memoryStorage.findIndex((c) => c.id === id);
		if (index === -1) return null;
		const merged: Category = {
			...memoryStorage[index],
			...changes,
			id,
		};
		memoryStorage[index] = merged;
		return merged;
	}

	async createBulk(categories: CategoryInput[], userId: string): Promise<Category[]> {
		// localStorage "bulk insert": just save each one. The `userId` is
		// ignored — localStorage is single-tenant. The spec's atomic-rollback
		// contract applies to the Supabase repository.
		const existing = await this.findAll();
		const next = [...existing];
		const created: Category[] = [];
		for (const c of categories) {
			const entity: Category = { ...c, id: uuidv4() };
			next.push(entity);
			created.push(entity);
		}
		if (isStorageAvailable()) {
			saveAllToStorage(next);
		} else {
			memoryStorage = next;
		}
		void userId;
		return created;
	}

	async delete(id: string): Promise<boolean> {
		if (isStorageAvailable()) {
			const categories = await this.findAll();
			const filtered = categories.filter((c) => c.id !== id);
			if (filtered.length === categories.length) {
				return false;
			}
			saveAllToStorage(filtered);
			return true;
		}

		const before = memoryStorage.length;
		memoryStorage = memoryStorage.filter((c) => c.id !== id);
		return memoryStorage.length < before;
	}
}

/**
 * Singleton instance of the repository.
 * Use this from services and hooks to keep the singleton-repository
 * pattern consistent with the rest of the codebase.
 */
export const categoryRepository = new LocalStorageCategoryRepository();
