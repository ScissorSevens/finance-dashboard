import { useEffect, useState } from 'preact/hooks';
import { useUser } from '@clerk/clerk-react';
import type { AuthContext } from '../../infrastructure/repositories/StorageProvider';
import { getClerkPublishableKey, SUPABASE_JWT_TEMPLATE } from '../../infrastructure/auth/ClerkProviderWrapper';

/**
 * Reactive auth state for the rest of the app.
 *
 * Returns an `AuthContext` that the StorageProvider consumes to pick the
 * right repository. Also exposes derived booleans so the UI can show
 * login/logout buttons, the offline indicator, and the migration dialog
 * without poking at Clerk directly.
 *
 * Design notes:
 * - The ClerkProvider is always mounted (see `ClerkProviderWrapper`),
 *   so the Clerk hooks can be called unconditionally.
 * - When no real Clerk key is configured, `getClerkPublishableKey()`
 *   returns `null` and the hook short-circuits to a logged-out stub
 *   without ever calling Clerk APIs.
 * - The JWT is fetched lazily via Clerk's `session.getToken({ template })`
 *   and re-fetched when the session changes.
 * - `isSupabaseConfigured` lets the UI show the right "sign in to sync"
 *   hint when only Clerk is configured.
 */
export interface UseAuthResult extends AuthContext {
	/** True after the first auth state resolution (avoids loading flashes). */
	isLoaded: boolean;
	/** True when a Clerk user is signed in. */
	isSignedIn: boolean;
	/** The Clerk user's display name (first + last), or null when signed out. */
	displayName: string | null;
	/** The Clerk user's primary email, or null. */
	email: string | null;
	/** True when both Clerk AND Supabase env vars are configured. */
	isSupabaseConfigured: boolean;
	/** True when the Clerk publishable key is configured. */
	isClerkConfigured: boolean;
}

/**
 * Hook entry point. Branches on Clerk configuration BEFORE calling any
 * Clerk hooks — if no key is set we never ask the SDK for anything.
 * Inside the "configured" branch we call the hooks unconditionally
 * (Preact's rules of hooks).
 */
export function useAuth(): UseAuthResult {
	const clerkConfigured = getClerkPublishableKey() !== null;
	if (!clerkConfigured) {
		return buildStub();
	}
	return useClerkAuthInner();
}

function buildStub(): UseAuthResult {
	return {
		userId: null,
		clerkJwt: null,
		isLoaded: true,
		isSignedIn: false,
		displayName: null,
		email: null,
		isSupabaseConfigured: isSupabaseConfigured(),
		isClerkConfigured: false,
	};
}

function isSupabaseConfigured(): boolean {
	const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
	const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
	if (!url || !key) return false;
	if (url === 'https://REPLACE_ME.supabase.co' || key.includes('REPLACE_ME')) return false;
	return true;
}

/**
 * Internal: actually wires up Clerk. Only called when the publishable
 * key is configured. Split out so `useAuth` itself can short-circuit
 * without violating the rules of hooks.
 */
function useClerkAuthInner(): UseAuthResult {
	const { isLoaded, isSignedIn, user } = useUser();
	const session = user ? (window as unknown as {
		Clerk?: { session?: { getToken: (opts: { template: string }) => Promise<string | null> } };
	}).Clerk?.session ?? null : null;
	const [clerkJwt, setClerkJwt] = useState<string | null>(null);

	// Resolve a Supabase-shaped JWT from the active Clerk session. We
	// re-run when the user changes so logout / token refresh are picked
	// up. While a new token is being fetched, the previous one stays in
	// state — a brief null state would force the StorageProvider to
	// localStorage mode and could cause a needless reload flicker.
	useEffect(() => {
		let cancelled = false;
		async function fetchToken() {
			if (!session) {
				setClerkJwt(null);
				return;
			}
			try {
				const token = await session.getToken({ template: SUPABASE_JWT_TEMPLATE });
				if (!cancelled) setClerkJwt(token);
			} catch (e) {
				console.error('[auth] failed to fetch Clerk Supabase JWT:', e);
				if (!cancelled) setClerkJwt(null);
			}
		}
		void fetchToken();
		return () => {
			cancelled = true;
		};
	}, [session]);

	return {
		userId: user?.id ?? null,
		clerkJwt,
		isLoaded,
		isSignedIn: Boolean(isLoaded && isSignedIn && user),
		displayName: user
			? [user.firstName, user.lastName].filter(Boolean).join(' ') || null
			: null,
		email: user?.primaryEmailAddress?.emailAddress ?? null,
		isSupabaseConfigured: isSupabaseConfigured(),
		isClerkConfigured: true,
	};
}
