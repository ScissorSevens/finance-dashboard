import { ClerkProvider } from '@clerk/clerk-react';
import type { ComponentChildren } from 'preact';

/**
 * Shape of a Clerk-issued Supabase JWT. Returned by `getToken({ template: 'supabase' })`.
 * The wrapper only cares about the JWT string; the rest of the shape is documented
 * here for context. The template name is configurable in the Clerk dashboard.
 */
export const SUPABASE_JWT_TEMPLATE = 'supabase';

// Build version: ensures a new bundle hash is generated when env vars change.
// This comment is intentionally kept so that the source file is never byte-identical
// to a previous build, forcing Vite to emit a fresh hash and bust CDN caches.
export const BUILD_VERSION = '2026-06-01-fix-migration-jwt-v6';

/**
 * Sentinel publishable key used when no real key is configured. The
 * format mirrors a real Clerk test key so the SDK accepts it
 * syntactically; API calls simply fail, the React context still mounts,
 * and Clerk hooks return safe defaults (`isLoaded: true, isSignedIn: false, userId: null`).
 *
 * This lets us render the ClerkProvider unconditionally so the rest of
 * the app can call `useAuth()` / `useUser()` / `useSession()` without
 * conditional hook calls (a React rules-of-hooks violation).
 */
const PLACEHOLDER_PUBLISHABLE_KEY = 'pk_test_placeholderfinance_dashboard00000000000000000$';

/**
 * Returns the Clerk publishable key, or `null` if it is not configured
 * (placeholder value, missing, or empty). The key is required by
 * `<ClerkProvider>` — without it, the SDK refuses to bootstrap.
 */
export function getClerkPublishableKey(): string | null {
	const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
	if (!key) return null;
	if (key === 'pk_test_REPLACE_ME' || key === 'pk_live_REPLACE_ME') return null;
	// Clerk publishable keys are prefixed with `pk_test_` or `pk_live_`
	// followed by a base64-encoded frontend API URL. The base64 payload
	// internally contains a `$` stop character (which decodes to a
	// trailing `$` in the API hostname) but the key string itself does
	// NOT end with `$` — that check would reject every valid Clerk key.
	// See: https://clerk.com/blog/refactoring-our-api-keys
	if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) {
		console.warn(
			'[clerk] VITE_CLERK_PUBLISHABLE_KEY does not look like a Clerk key (expected pk_test_... or pk_live_...). Auth will be disabled.'
		);
		return null;
	}
	return key;
}

interface ClerkProviderWrapperProps {
	children: ComponentChildren;
	/**
	 * Optional Clerk route overrides. The Dashboard does not need these
	 * (it uses Clerk's hosted sign-in / sign-up flows), but the
	 * dedicated `/sign-in` and `/sign-up` Astro pages pass them so that
	 * the path-based Clerk components resolve their cross-links and
	 * post-auth redirects correctly.
	 */
	signInUrl?: string;
	signUpUrl?: string;
	afterSignInUrl?: string;
	afterSignUpUrl?: string;
}

/**
 * Thin wrapper around `@clerk/clerk-react`'s `ClerkProvider` that:
 * 1. Always renders the provider (even when the publishable key is
 *    missing) using a placeholder key. This keeps the React context in
 *    place so hooks like `useUser` / `useSession` / `useAuth` can be
 *    called unconditionally without throwing. When no real key is set,
 *    the SDK never authenticates — hooks return safe defaults.
 * 2. Renders Preact-compatible children while delegating to the React
 *    ClerkProvider (Preact's `compat: true` makes this transparent).
 *
 * The wrapper is intentionally a Preact component so it can be used
 * directly inside other Preact components (Dashboard.tsx) and inside
 * Preact islands mounted from Astro pages. Putting the provider inside
 * a Preact tree (rather than an Astro layout) keeps Clerk's hooks
 * working — they require React/Preact context, which Astro components
 * do not provide.
 */
export default function ClerkProviderWrapper({
	children,
	signInUrl,
	signUpUrl,
	afterSignInUrl,
	afterSignUpUrl,
}: ClerkProviderWrapperProps) {
	// Reference BUILD_VERSION so Vite doesn't tree-shake it.
	void BUILD_VERSION;
	const publishableKey = getClerkPublishableKey() ?? PLACEHOLDER_PUBLISHABLE_KEY;
	return (
		<ClerkProvider
			publishableKey={publishableKey}
			signInUrl={signInUrl}
			signUpUrl={signUpUrl}
			afterSignInUrl={afterSignInUrl}
			afterSignUpUrl={afterSignUpUrl}
			afterSignOutUrl="/"
		>
			{children}
		</ClerkProvider>
	);
}
