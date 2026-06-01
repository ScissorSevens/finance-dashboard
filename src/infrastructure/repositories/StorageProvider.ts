import type { SupabaseClient } from '@supabase/supabase-js';
import type { TransactionRepository } from '../../domain/repositories/TransactionRepository';
import type { CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { LocalStorageTransactionRepository } from './LocalStorageTransactionRepository';
import { LocalStorageCategoryRepository } from './LocalStorageCategoryRepository';
import { SupabaseTransactionRepository } from './SupabaseTransactionRepository';
import { SupabaseCategoryRepository } from './SupabaseCategoryRepository';
import { getSupabaseClient, applyClerkSession } from '../supabase/client';

/**
 * Authentication state required by the StorageProvider to make its
 * strategy decision. The provider is auth-agnostic — it doesn't know
 * about Clerk, sessions, JWTs, etc. — it just asks "is there a logged-in
 * user with a valid token?".
 */
export interface AuthContext {
	/** Clerk user.id; only present when authenticated. */
	userId: string | null;
	/** Clerk-issued Supabase JWT (template "supabase"), or null when offline. */
	clerkJwt: string | null;
}

/**
 * Strategy interface for selecting a storage backend. Implementations
 * may pick localStorage (offline / unauthenticated / Supabase
 * unconfigured) or Supabase (authenticated + Supabase configured).
 *
 * The contract is intentionally minimal: it returns fresh repository
 * instances every call, so callers never need to worry about caching
 * or auth state changing mid-request.
 */
export interface StorageProvider {
	/**
	 * Get the right TransactionRepository for the current auth state.
	 */
	getTransactionRepository(auth: AuthContext): TransactionRepository;

	/**
	 * Get the right CategoryRepository for the current auth state.
	 */
	getCategoryRepository(auth: AuthContext): CategoryRepository;

	/**
	 * Human-readable label of the active strategy. Useful for debug
	 * overlays and the "offline" indicator (spec scenario
	 * "Supabase unavailable → offline indicator").
	 */
	getActiveBackend(): 'supabase' | 'localStorage';
}

/**
 * Singleton holders so the Supabase client is reused across calls.
 * The localStorage repos are already singletons, but we wrap them in
 * fresh instances for symmetry.
 */
let supabaseAuthCache: { userId: string; jwt: string } | null = null;

/**
 * Build a StorageProvider that picks Supabase when the user is
 * authenticated AND Supabase is configured, and localStorage otherwise.
 *
 * The provider reacts to auth state on every call (no caching of the
 * auth state itself) so logging in / out / network blips are picked up
 * immediately.
 */
export function createStorageProvider(): StorageProvider {
	return {
		getTransactionRepository(auth: AuthContext): TransactionRepository {
			if (auth.userId) {
				const client = getSupabaseClient();
				if (client) {
					void syncSupabaseAuth(client, auth);
					return new SupabaseTransactionRepository(client, auth.userId);
				}
			}
			return new LocalStorageTransactionRepository();
		},

		getCategoryRepository(auth: AuthContext): CategoryRepository {
			if (auth.userId) {
				const client = getSupabaseClient();
				if (client) {
					void syncSupabaseAuth(client, auth);
					return new SupabaseCategoryRepository(client, auth.userId);
				}
			}
			return new LocalStorageCategoryRepository();
		},

		getActiveBackend(): 'supabase' | 'localStorage' {
			// The active backend is determined by whether the LAST
			// successful call to applyClerkSession happened with a
			// valid user. If not, we're in localStorage mode.
			if (supabaseAuthCache && getSupabaseClient()) {
				return 'supabase';
			}
			return 'localStorage';
		},
	};
}

/**
 * Apply the Clerk session to the Supabase client if it has changed.
 * Cached per (userId, jwt) tuple so we don't make repeated
 * `setSession` round trips on every CRUD call.
 */
function syncSupabaseAuth(client: SupabaseClient, auth: AuthContext): void {
	if (!auth.userId) {
		if (supabaseAuthCache) {
			void applyClerkSession(client, null);
			supabaseAuthCache = null;
		}
		return;
	}
	if (
		supabaseAuthCache &&
		supabaseAuthCache.userId === auth.userId &&
		supabaseAuthCache.jwt === auth.clerkJwt
	) {
		return; // already applied
	}
	supabaseAuthCache = { userId: auth.userId, jwt: auth.clerkJwt ?? '' };
	void applyClerkSession(client, auth.clerkJwt);
}
