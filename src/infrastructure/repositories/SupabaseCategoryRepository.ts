import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, CategoryInput } from '../../domain/entities/Category';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { StorageError } from './LocalStorageTransactionRepository';

/**
 * Row shape for the Supabase `categories` table. Mirrors the schema in
 * `supabase/schema.sql`.
 */
interface CategoryRow {
	id: string;
	user_id: string;
	name: string;
	type: 'income' | 'expense';
	color: string;
	icon: string | null;
	is_default: boolean;
	created_at: string;
	updated_at: string;
}

function rowToCategory(row: CategoryRow): Category {
	return {
		id: row.id,
		name: row.name,
		type: row.type,
		color: row.color,
		...(row.icon ? { icon: row.icon } : {}),
		isDefault: row.is_default,
	};
}

/**
 * Supabase implementation of `CategoryRepository`.
 *
 * Same construction pattern as `SupabaseTransactionRepository`: the
 * `userId` is injected so every write can stamp `user_id`, and the
 * caller is responsible for authenticating the client (the
 * `StorageProvider` factory wires up the Clerk JWT).
 */
export class SupabaseCategoryRepository implements CategoryRepository {
	constructor(
		private readonly client: SupabaseClient,
		private readonly userId: string
	) {}

	async findAll(): Promise<Category[]> {
		const { data, error } = await this.client
			.from('categories')
			.select('*')
			.eq('user_id', this.userId)
			.order('type', { ascending: true })
			.order('name', { ascending: true });

		if (error) {
			throw new StorageError(
				`Failed to fetch categories: ${error.message}`,
				'read',
				new Error(error.message)
			);
		}
		return (data ?? []).map((row) => rowToCategory(row as CategoryRow));
	}

	async findById(id: string): Promise<Category | null> {
		const { data, error } = await this.client
			.from('categories')
			.select('*')
			.eq('user_id', this.userId)
			.eq('id', id)
			.maybeSingle();

		if (error) {
			throw new StorageError(
				`Failed to fetch category ${id}: ${error.message}`,
				'read',
				new Error(error.message)
			);
		}
		return data ? rowToCategory(data as CategoryRow) : null;
	}

	async save(category: CategoryInput): Promise<Category> {
		const { data, error } = await this.client
			.from('categories')
		.insert({
			user_id: this.userId,
			name: category.name,
			type: category.type,
			color: category.color,
			icon: category.icon ?? null,
			is_default: category.isDefault,
		})
			.select('*')
			.single();

		if (error || !data) {
			throw new StorageError(
				`Failed to create category: ${error?.message ?? 'no row returned'}`,
				'write',
				error ? new Error(error.message) : undefined
			);
		}
		return rowToCategory(data as CategoryRow);
	}

	async update(id: string, changes: Partial<CategoryInput>): Promise<Category | null> {
		const patch: Record<string, unknown> = {};
		if (changes.name !== undefined) patch.name = changes.name;
		if (changes.type !== undefined) patch.type = changes.type;
		if (changes.color !== undefined) patch.color = changes.color;
		if (changes.icon !== undefined) patch.icon = changes.icon ?? null;
		if (changes.isDefault !== undefined) patch.is_default = changes.isDefault;

		const { data, error } = await this.client
			.from('categories')
			.update(patch)
			.eq('user_id', this.userId)
			.eq('id', id)
			.select('*')
			.maybeSingle();

		if (error) {
			throw new StorageError(
				`Failed to update category ${id}: ${error.message}`,
				'write',
				new Error(error.message)
			);
		}
		return data ? rowToCategory(data as CategoryRow) : null;
	}

	async delete(id: string): Promise<boolean> {
		const { error, count } = await this.client
			.from('categories')
			.delete({ count: 'exact' })
			.eq('user_id', this.userId)
			.eq('id', id);

		if (error) {
			throw new StorageError(
				`Failed to delete category ${id}: ${error.message}`,
				'delete',
				new Error(error.message)
			);
		}
		return (count ?? 0) > 0;
	}

	/**
	 * Atomic bulk insert for the localStorage → Supabase migration path.
	 * Same single-INSERT strategy as the transaction repo.
	 */
	async createBulk(categories: CategoryInput[], userId: string): Promise<Category[]> {
		if (categories.length === 0) return [];

		const payload = categories.map((c) => ({
			user_id: userId,
			name: c.name,
			type: c.type,
			color: c.color,
			icon: c.icon ?? null,
			is_default: c.isDefault,
		}));

		const { data, error } = await this.client
			.from('categories')
		.insert(payload)
			.select('*');

		if (error || !data) {
			throw new StorageError(
				`Migration bulk insert failed: ${error?.message ?? 'no rows returned'}`,
				'write',
				error ? new Error(error.message) : undefined
			);
		}
		return (data as CategoryRow[]).map(rowToCategory);
	}
}
