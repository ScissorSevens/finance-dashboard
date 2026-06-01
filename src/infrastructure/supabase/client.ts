import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase client.
 *
 * The client is created lazily so that the absence of env vars (e.g. during
 * local dev without secrets, or in CI) does not crash the app — it just logs
 * a warning and returns `null`. Callers must handle the `null` case and fall
 * back to the localStorage repository.
 *
 * Auth strategy (Clerk → Supabase native Third-Party Auth, post-April 2025):
 *   1. Supabase is configured as a Third-Party Auth provider in
 *      Authentication > Sign In / Providers > Clerk, with the Clerk domain.
 *   2. The Supabase client is created with the anon key PLUS an
 *      `accessToken` callback that returns the current Clerk session JWT.
 *   3. On every request, the Supabase JS SDK injects
 *      `Authorization: Bearer <clerk_jwt>` and Supabase validates the JWT
 *      using the Third-Party Auth integration. The `sub` claim
 *      (Clerk's user.id, e.g. "user_3EWGG9rtW9fiLwfl0KI9XkSOldk") is
 *      available in Postgres as `auth.jwt()->>'sub'`, so our RLS
 *      policies `(auth.jwt()->>'sub') = user_id` work correctly.
 *
 * The Clerk user.id is mirrored as `user_id` (text) in our tables by every
 * Supabase*Repository. See `supabase/schema.sql` for the policy setup.
 *
 * References:
 *   - https://clerk.com/docs/guides/development/integrations/databases/supabase
 *   - https://supabase.com/docs/guides/auth/third-party/clerk
 */
let cachedClient: SupabaseClient | null = null;
let cachedConfig: { url: string; anonKey: string } | null = null;
let cachedTokenProvider: () => Promise<string | null> = async () => null;

// Build version: forces a new bundle hash so CDN caches don't serve stale assets.
// Bump this when env-driven configuration changes.
export const SUPABASE_BUILD_VERSION = '2026-06-01-native-third-party-auth-v4';

/**
 * Read Supabase env vars. Returns `null` when either is missing or empty.
 * Astro/Vite exposes only `VITE_*` (and `PUBLIC_*`) env vars to the browser
 * bundle, so we expect the `VITE_` prefix.
 */
function readConfig(): { url: string; anonKey: string } | null {
	if (cachedConfig) return cachedConfig;
	const url = import.meta.env.VITE_SUPABASE_URL?.trim();
	const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
	if (!url || !anonKey) {
		return null;
	}
	if (url === 'https://REPLACE_ME.supabase.co' || anonKey.includes('REPLACE_ME')) {
		// Treat the documented placeholder values as "not configured".
		return null;
	}
	cachedConfig = { url, anonKey };
	return cachedConfig;
}

/**
 * Returns the singleton Supabase client, or `null` if Supabase is not
 * configured. The caller is responsible for the fallback.
 *
 * The client uses the `accessToken` callback pattern (Clerk Third-Party Auth).
 * The token provider is updated by `applyClerkSession` whenever the Clerk
 * session changes; if no provider has been registered yet, the callback
 * returns `null` and the client is effectively anonymous (RLS will reject
 * reads/writes).
 */
export function getSupabaseClient(): SupabaseClient | null {
	if (cachedClient) return cachedClient;
	void SUPABASE_BUILD_VERSION; // force inclusion
	const config = readConfig();
	if (!config) {
		return null;
	}
	cachedClient = createClient(config.url, config.anonKey, {
		accessToken: async () => cachedTokenProvider(),
		auth: {
			// We manage auth externally (Clerk). Disable Supabase's built-in
			// session persistence to avoid clobbering the Clerk session.
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
		global: {
			headers: { 'x-application-name': 'finance-dashboard' },
		},
	});
	return cachedClient;
}

/**
 * Register (or clear) the Clerk session token used by the Supabase client.
 *
 * Pass the Clerk session token (no template needed — the native Supabase
 * integration accepts the default session token) so that RLS policies
 * using `auth.jwt()->>'sub'` resolve to the Clerk user.id. Calling this
 * with `null` clears the token and the next request will be anonymous
 * (RLS will reject reads/writes).
 *
 * Note: the function is synchronous because the `accessToken` callback
 * is called on demand by the Supabase SDK; we just register a function
 * that returns the latest known token. The token is fetched fresh on
 * each request inside the callback closure.
 */
export function applyClerkSession(
	_client: SupabaseClient,
	clerkJwt: string | null
): void {
	// We do NOT call setSession here. The official Clerk + Supabase
	// integration (post-April 2025) uses the `accessToken` callback
	// that we registered in getSupabaseClient(), which injects the
	// Clerk session JWT on every request. We just update the closure.
	cachedTokenProvider = async () => clerkJwt;
}

/**
 * Test helper: reset the singleton. NOT used in production code paths.
 */
export function __resetSupabaseClientForTesting(): void {
	cachedClient = null;
	cachedConfig = null;
	cachedTokenProvider = async () => null;
}
