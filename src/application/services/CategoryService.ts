import type { Category, CategoryInput } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import {
	categoryRepository as defaultCategoryRepository,
} from '../../infrastructure/repositories/LocalStorageCategoryRepository';

/**
 * Error thrown when the caller attempts to mutate a default category
 * in a way that the business rules disallow (currently: deletion).
 */
export class DefaultCategoryProtectedError extends Error {
	constructor(
		public readonly categoryId: string,
		public readonly categoryName: string
	) {
		super(`La categoría predeterminada "${categoryName}" no se puede eliminar`);
		this.name = 'DefaultCategoryProtectedError';
	}
}

/**
 * Error thrown when category validation fails (e.g. missing required fields,
 * invalid color format, empty name).
 */
export class CategoryValidationError extends Error {
	constructor(message: string, public readonly field: string) {
		super(message);
		this.name = 'CategoryValidationError';
	}
}

/**
 * Service layer for category operations.
 * Implements business rules and orchestrates repository calls.
 *
 * Business rules enforced here:
 * - Default categories (isDefault=true) cannot be deleted.
 * - New categories must have a non-empty name.
 * - Color must be a valid hex string.
 */
export class CategoryService {
	constructor(private readonly repository: CategoryRepository = defaultCategoryRepository) {}

	/**
	 * Get all categories, ordered by type (income first) then by name.
	 */
	async getAll(): Promise<Category[]> {
		const categories = await this.repository.findAll();
		return categories.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === 'income' ? -1 : 1;
			}
			return a.name.localeCompare(b.name);
		});
	}

	/**
	 * Get a single category by ID.
	 */
	async getById(id: string): Promise<Category | null> {
		return this.repository.findById(id);
	}

	/**
	 * Create a new category. Performs validation before delegating to the
	 * repository. Returns the persisted entity (with assigned id).
	 */
	async add(input: CategoryInput): Promise<Category> {
		this.validate(input);
		return this.repository.save(input);
	}

	/**
	 * Update an existing category. Performs validation on the partial input.
	 *
	 * With Phase 3, the repository contract gained a first-class `update`
	 * method, so this implementation delegates directly. The previous
	 * delete+save workaround is gone.
	 */
	async update(id: string, changes: Partial<CategoryInput>): Promise<Category | null> {
		const existing = await this.repository.findById(id);
		if (!existing) return null;

		const merged: CategoryInput = {
			...existing,
			...changes,
			// isDefault cannot be flipped to true via the UI; if the caller
			// didn't pass it explicitly, preserve the original value.
			isDefault: changes.isDefault ?? existing.isDefault,
		};
		this.validate(merged);

		return this.repository.update(id, merged);
	}

	/**
	 * Delete a category. Rejects deletion of default categories.
	 * Returns `false` when the category does not exist.
	 */
	async remove(id: string): Promise<boolean> {
		const existing = await this.repository.findById(id);
		if (!existing) return false;
		if (existing.isDefault) {
			throw new DefaultCategoryProtectedError(existing.id, existing.name);
		}
		return this.repository.delete(id);
	}

	/**
	 * Internal validation for category inputs.
	 */
	private validate(input: CategoryInput): void {
		if (!input.name || !input.name.trim()) {
			throw new CategoryValidationError('El nombre de la categoría es requerido', 'name');
		}
		if (input.type !== 'income' && input.type !== 'expense') {
			throw new CategoryValidationError('El tipo debe ser "income" o "expense"', 'type');
		}
		if (!input.color || !/^#[0-9a-fA-F]{6}$/.test(input.color)) {
			throw new CategoryValidationError('El color debe ser un código hex válido (ej: #ff0000)', 'color');
		}
	}
}

/**
 * Singleton instance of the service, wired to the default
 * (localStorage) category repository. Inject a different repository
 * (e.g. in tests) by constructing `new CategoryService(repo)` directly.
 */
export const categoryService = new CategoryService();
