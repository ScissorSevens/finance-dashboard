import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase client.
 *
 * The client is created lazily so that the absence of env vars (e.g. during
 * local dev without secrets, or in CI) does not crash the app — it just logs
 * a warning and returns `null`. Callers must handle the `null` case and fall
 * back to the localStorage repository.
 *
 * Auth strategy: we use the Supabase anon key for the initial client, then
 * `applyClerkSession` re-authenticates the client with the Clerk session JWT
 * (mapped to Supabase's `auth.uid()` via a Clerk JWT template — see
 * `supabase/schema.sql` for the recommended RLS setup).
 *
 * The Clerk user.id is mirrored as `user_id` in our tables by every
 * Supabase*Repository so RLS policies like
 * `USING (user_id = auth.uid())` keep working.
 */
let cachedClient: SupabaseClient | null = null;
let cachedConfig: { url: string; anonKey: string } | null = null;

// Build version: forces a new bundle hash so CDN caches don't serve stale assets.
// Bump this when env-driven configuration changes.
export const SUPABASE_BUILD_VERSION = '2026-06-01-force-cdn-refresh-v2';

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
 */
export function getSupabaseClient(): SupabaseClient | null {
	if (cachedClient) return cachedClient;
	void SUPABASE_BUILD_VERSION; // force inclusion
	const config = readConfig();
	if (!config) {
		return null;
	}
	cachedClient = createClient(config.url, config.anonKey, {
		auth: {
			// We manage auth externally (Clerk → Supabase via JWT template).
			// Disable Supabase's built-in session persistence to avoid
			// clobbering the Clerk-issued session token.
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
 * Re-authenticate the Supabase client with a Clerk-issued JWT.
 *
 * Pass the Clerk session token (template: "supabase") so that RLS policies
 * using `auth.uid()` resolve to the Clerk user.id. Calling this with `null`
 * clears the Supabase session and the next request will be anonymous
 * (RLS will reject reads/writes).
 */
export async function applyClerkSession(
	client: SupabaseClient,
	clerkJwt: string | null
): Promise<void> {
	if (clerkJwt) {
		// Supabase JS expects a session object with `access_token` (the JWT)
		// and `refresh_token` (we use a placeholder because we never refresh
		// — Clerk handles the underlying Clerk session refresh).
		// The `expires_at` is informational; the actual expiration is
		// enforced by Supabase on the server.
		const { error } = await client.auth.setSession({
			access_token: clerkJwt,
			refresh_token: 'clerk-managed',
		});
		if (error) {
			console.error('[supabase] failed to apply Clerk session:', error);
		}
	} else {
		await client.auth.signOut();
	}
}

/**
 * Test helper: reset the singleton. NOT used in production code paths.
 */
export function __resetSupabaseClientForTesting(): void {
	cachedClient = null;
	cachedConfig = null;
}
