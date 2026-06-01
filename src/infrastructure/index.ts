// Infrastructure exports
export {
	LocalStorageTransactionRepository,
	transactionRepository,
	StorageError,
} from './repositories/LocalStorageTransactionRepository';
export {
	LocalStorageCategoryRepository,
	categoryRepository,
} from './repositories/LocalStorageCategoryRepository';
export { SupabaseTransactionRepository } from './repositories/SupabaseTransactionRepository';
export { SupabaseCategoryRepository } from './repositories/SupabaseCategoryRepository';
export { createStorageProvider } from './repositories/StorageProvider';
export type { StorageProvider, AuthContext } from './repositories/StorageProvider';
export { getSupabaseClient, applyClerkSession } from './supabase/client';
export { default as ClerkProviderWrapper, getClerkPublishableKey, SUPABASE_JWT_TEMPLATE } from './auth/ClerkProviderWrapper';
