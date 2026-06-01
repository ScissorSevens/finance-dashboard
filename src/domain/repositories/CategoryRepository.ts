import type { Category, CategoryInput } from '../entities/Category';

/**
 * Repository interface for Category persistence
 *
 * Following Clean Architecture, this defines the contract that the
 * infrastructure layer (e.g. LocalStorageCategoryRepository, future
 * SupabaseCategoryRepository) must implement.
 */
export interface CategoryRepository {
	/**
	 * Get all categories, ordered by type (income first) then by name.
	 */
	findAll(): Promise<Category[]>;

	/**
	 * Get a single category by ID.
	 * Returns `null` when the category does not exist.
	 */
	findById(id: string): Promise<Category | null>;

	/**
	 * Persist a new category. Implementations must assign a unique id
	 * (typically UUID v4) before returning the stored entity.
	 */
	save(category: CategoryInput): Promise<Category>;

	/**
	 * Update an existing category in place. Returns the updated entity
	 * or `null` if the id was not found.
	 */
	update(id: string, changes: Partial<CategoryInput>): Promise<Category | null>;

	/**
	 * Remove a category by ID.
	 * Returns `true` when a category was removed, `false` when not found.
	 */
	delete(id: string): Promise<boolean>;

	/**
	 * Bulk-insert a batch of categories. Used by the localStorage →
	 * cloud migration path so the entire dataset moves in a single
	 * round trip. Implementations MUST be atomic: on any per-row
	 * failure, the entire batch MUST be rolled back.
	 *
	 * @param categories  Entities to insert (the implementation assigns ids).
	 * @param userId      The Clerk user.id; persisted as `user_id`.
	 */
	createBulk(categories: CategoryInput[], userId: string): Promise<Category[]>;
}
