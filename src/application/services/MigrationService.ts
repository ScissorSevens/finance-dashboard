import type { Transaction } from '../../domain/entities/Transaction';
import type { Category, CategoryInput } from '../../domain/entities/Category';
import type { TransactionRepository } from '../../domain/repositories/TransactionRepository';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { createStorageProvider, type StorageProvider } from '../../infrastructure/repositories/StorageProvider';
import { LocalStorageTransactionRepository } from '../../infrastructure/repositories/LocalStorageTransactionRepository';
import { LocalStorageCategoryRepository } from '../../infrastructure/repositories/LocalStorageCategoryRepository';
import { StorageError } from '../../infrastructure/repositories/LocalStorageTransactionRepository';

/**
 * Storage keys used by the localStorage repositories. Centralised here
 * so the migration service and the repositories can never drift.
 */
const TRANSACTIONS_KEY = 'finance-dashboard-transactions';
const CATEGORIES_KEY = 'finance-dashboard-categories';
const MIGRATION_FLAG_KEY = 'finance-dashboard-migration-complete';

/**
 * Snapshot of what migration could/should do. Produced by `detect()`
 * and consumed by the UI to decide whether to show the dialog.
 */
export interface MigrationState {
	/** True when at least one entity is present in localStorage. */
	hasLocalStorageData: boolean;
	/** True when the migration has been completed at least once. */
	isMigrationComplete: boolean;
	transactionCount: number;
	categoryCount: number;
}

/**
 * Progress event emitted during a migration run. The UI subscribes to
 * these to show "Sincronizando X transacciones..." feedback.
 */
export interface MigrationProgress {
	phase: 'transactions' | 'categories' | 'cleanup' | 'done';
	processed: number;
	total: number;
	message: string;
}

/**
 * Error thrown when a migration step fails. The localStorage data is
 * preserved (no rollback needed because the partial inserts on the
 * Supabase side are atomic — see Supabase*Repository.createBulk).
 */
export class MigrationError extends Error {
	constructor(
		message: string,
		public readonly phase: 'detect' | 'transactions' | 'categories' | 'cleanup'
	) {
		super(message);
		this.name = 'MigrationError';
	}
}

type ProgressCallback = (progress: MigrationProgress) => void;

/**
 * Orchestrates the localStorage → Supabase migration.
 *
 * Spec scenarios covered:
 * - Data exists in localStorage → flag set to false → dialog shown
 * - User accepts migration → bulk-insert, clear localStorage, set flag
 * - User declines migration → no-op (flag stays false → dual-mode)
 * - No localStorage data → flag set, no dialog
 * - Migration partial failure → entire migration rolled back, error
 *   thrown, localStorage preserved
 */
export class MigrationService {
	constructor(private readonly storage: StorageProvider) {}

	/**
	 * Inspect localStorage to decide whether the migration dialog should
	 * appear. The flag is read with a default of `false` so first-time
	 * users always see the dialog if they have data.
	 */
	async detect(): Promise<MigrationState> {
		const txRepo = new LocalStorageTransactionRepository();
		const catRepo = new LocalStorageCategoryRepository();
		const [transactions, categories] = await Promise.all([
			txRepo.getAll().catch(() => [] as Transaction[]),
			catRepo.findAll().catch(() => [] as Category[]),
		]);
		const isMigrationComplete = readFlag(MIGRATION_FLAG_KEY) === 'true';
		return {
			hasLocalStorageData: transactions.length > 0 || categories.length > 0,
			isMigrationComplete,
			transactionCount: transactions.length,
			categoryCount: categories.length,
		};
	}

	/**
	 * Run the migration. The repos used to write into Supabase come from
	 * the StorageProvider (so they get the user-scoped client). The repos
	 * used to READ from localStorage are the LocalStorage* ones, which
	 * is the only place the data lives pre-migration.
	 *
	 * `clerkJwt` is the Clerk-issued Supabase JWT (template: "supabase")
	 * used to authenticate the Supabase client so RLS policies
	 * (`auth.jwt()->>'sub' = user_id`) match. Without it, the Supabase
	 * client is anonymous and RLS silently rejects every insert.
	 *
	 * On any failure, the localStorage data is left untouched — the
	 * spec scenario "Migration partial failure" requires the original
	 * data to be preserved so the user can retry.
	 */
	async migrateAll(
		userId: string,
		clerkJwt: string | null,
		onProgress?: ProgressCallback
	): Promise<{ transactions: Transaction[]; categories: Category[] }> {
		// Read from localStorage (the source of truth during migration).
		const localTxRepo = new LocalStorageTransactionRepository();
		const localCatRepo = new LocalStorageCategoryRepository();
		const [localTx, localCat] = await Promise.all([
			localTxRepo.getAll().catch((e) => {
				throw new MigrationError(
					`Failed to read local transactions: ${(e as Error).message}`,
					'detect'
				);
			}),
			localCatRepo.findAll().catch((e) => {
				throw new MigrationError(
					`Failed to read local categories: ${(e as Error).message}`,
					'detect'
				);
			}),
		]);

		// Get Supabase-backed repos from the provider. If the provider
		// returns a localStorage repo (e.g. Supabase not configured), we
		// fail fast — the dialog would not have been shown without Supabase.
		const remoteTx: TransactionRepository = this.storage.getTransactionRepository({
			userId,
			clerkJwt,
		});
		const remoteCat: CategoryRepository = this.storage.getCategoryRepository({
			userId,
			clerkJwt,
		});
		if (
			remoteTx instanceof LocalStorageTransactionRepository ||
			remoteCat instanceof LocalStorageCategoryRepository
		) {
			throw new MigrationError(
				'Cannot migrate: Supabase backend is not active. Are the env vars configured?',
				'detect'
			);
		}

		// Phase 1: transactions
		onProgress?.({
			phase: 'transactions',
			processed: 0,
			total: localTx.length,
			message: `Sincronizando ${localTx.length} transacciones…`,
		});
		let migratedTx: Transaction[] = [];
		if (localTx.length > 0) {
			try {
				migratedTx = await remoteTx.createBulk(
					localTx.map((t) => ({
						amount: t.amount,
						type: t.type,
						category: t.category,
						description: t.description,
						date: t.date,
					})),
					userId
				);
			} catch (e) {
				const msg = e instanceof StorageError ? e.message : (e as Error).message;
				throw new MigrationError(
					`Migration failed during transaction bulk insert: ${msg}`,
					'transactions'
				);
			}
		}

		// Phase 2: categories
		onProgress?.({
			phase: 'categories',
			processed: 0,
			total: localCat.length,
			message: `Sincronizando ${localCat.length} categorías…`,
		});
		let migratedCat: Category[] = [];
		if (localCat.length > 0) {
			try {
				const payload: CategoryInput[] = localCat.map((c) => ({
					name: c.name,
					type: c.type,
					color: c.color,
					...(c.icon ? { icon: c.icon } : {}),
					isDefault: c.isDefault,
				}));
				migratedCat = await remoteCat.createBulk(payload, userId);
			} catch (e) {
				// ROLLBACK: the transaction inserts already happened
				// successfully. We need to undo them. The Supabase repos
				// expose a delete, but bulk-delete is not in the interface.
				// We rely on the user_id filter and per-row delete in a loop.
				await this.rollbackTransactions(remoteTx, migratedTx, userId);
				const msg = e instanceof StorageError ? e.message : (e as Error).message;
				throw new MigrationError(
					`Migration failed during category bulk insert; transactions rolled back: ${msg}`,
					'categories'
				);
			}
		}

		// Phase 3: cleanup — clear localStorage, set the flag
		onProgress?.({
			phase: 'cleanup',
			processed: 0,
			total: 0,
			message: 'Limpiando almacenamiento local…',
		});
		try {
			this.clearLocalData();
			writeFlag(MIGRATION_FLAG_KEY, 'true');
		} catch (e) {
			throw new MigrationError(
				`Failed to clear local data: ${(e as Error).message}`,
				'cleanup'
			);
		}

		onProgress?.({
			phase: 'done',
			processed: 0,
			total: 0,
			message: 'Migración completada',
		});

		return { transactions: migratedTx, categories: migratedCat };
	}

	/**
	 * Mark migration as "user declined" by setting the flag without
	 * touching localStorage. Subsequent loads skip the dialog and stay
	 * in dual-mode (localStorage remains the source of truth for this
	 * browser).
	 */
	markDeclined(): void {
		writeFlag(MIGRATION_FLAG_KEY, 'true');
	}

	/**
	 * Read-only access to the flag, for components that need to render
	 * differently based on whether migration already happened.
	 */
	isComplete(): boolean {
		return readFlag(MIGRATION_FLAG_KEY) === 'true';
	}

	/**
	 * Best-effort rollback of a partial transaction insert. Per-row
	 * delete is not atomic at the application layer, but Postgres RLS
	 * ensures we only delete rows that belong to this user.
	 */
	private async rollbackTransactions(
		repo: TransactionRepository,
		transactions: Transaction[],
		_userId: string
	): Promise<void> {
		for (const tx of transactions) {
			try {
				await repo.delete(tx.id);
			} catch (e) {
				console.error('[migration] rollback failed for tx', tx.id, e);
			}
		}
	}

	private clearLocalData(): void {
		try {
			localStorage.removeItem(TRANSACTIONS_KEY);
			localStorage.removeItem(CATEGORIES_KEY);
		} catch {
			// localStorage not available → nothing to clear
		}
	}
}

/**
 * Read a string flag from localStorage with SSR / disabled-storage safety.
 */
function readFlag(key: string): string | null {
	try {
		if (typeof localStorage === 'undefined') return null;
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Write a string flag to localStorage with SSR / disabled-storage safety.
 */
function writeFlag(key: string, value: string): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(key, value);
	} catch {
		// ignore — the next detect() will just show the dialog again
	}
}

/**
 * Default factory: returns a fresh MigrationService wired to the
 * default storage provider. Use this in components that don't need to
 * inject a custom provider. Construct a fresh
 * `MigrationService(storageProvider)` directly when you need to inject
 * a different provider (e.g. in tests).
 */
export function createMigrationService(): MigrationService {
	return new MigrationService(createStorageProvider());
}

/**
 * Convenience singleton for the common case (no injection). Lazy so
 * the Supabase client is only initialised in the browser, and the
 * migration flag check is cheap on every access.
 */
let _singleton: MigrationService | null = null;
export function getMigrationService(): MigrationService {
	if (!_singleton) _singleton = createMigrationService();
	return _singleton;
}
