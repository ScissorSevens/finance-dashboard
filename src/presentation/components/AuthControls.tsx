import { useState } from 'preact/hooks';
import { useAuth } from '../../application/hooks/useAuth';

/**
 * Top-bar auth controls shown on the dashboard.
 *
 * Renders one of three states:
 * 1. Loading (Clerk is resolving the session)
 * 2. Signed out: "Iniciar sesión" button + status hint
 * 3. Signed in: avatar circle with initial + email/name + logout menu
 *
 * Also surfaces the offline / "local-only" hint when Supabase is not
 * configured so the user understands why cloud features are disabled.
 *
 * Spec scenarios covered:
 * - Logout: clicking "Cerrar sesión" destroys the session
 * - Email login: signing in via Clerk shows the user info here
 * - Unconfigured Clerk: shows a "local-only" hint instead of the button
 */
export default function AuthControls() {
	const { isLoaded, isSignedIn, displayName, email, isClerkConfigured, isSupabaseConfigured } =
		useAuth();
	const [menuOpen, setMenuOpen] = useState(false);

	// Loading state — Clerk is still resolving the session.
	if (!isLoaded) {
		return (
			<div class="flex items-center gap-3">
				<div class="animate-pulse h-8 w-32 bg-gray-200 rounded"></div>
			</div>
		);
	}

	// Signed out state.
	if (!isSignedIn) {
		return (
			<div class="flex items-center gap-3">
				{!isClerkConfigured && (
					<span class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
						Modo local (auth no configurado)
					</span>
				)}
				{isClerkConfigured && !isSupabaseConfigured && (
					<span class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
						Modo local (Supabase no configurado)
					</span>
				)}
				<SignInButton />
			</div>
		);
	}

	// Signed in state — show user chip + dropdown menu.
	const initial = (email?.[0] ?? displayName?.[0] ?? '?').toUpperCase();
	return (
		<div class="relative">
			<button
				type="button"
				onClick={() => setMenuOpen((v) => !v)}
				class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
			>
				<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
					{initial}
				</span>
				<span class="hidden sm:inline text-sm text-gray-700">
					{email ?? displayName ?? 'Sesión activa'}
				</span>
				<svg
					class="w-4 h-4 text-gray-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{menuOpen && (
				<div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
					<div class="px-4 py-3 border-b border-gray-100">
						<div class="text-sm font-medium text-gray-900 truncate">
							{displayName ?? 'Sin nombre'}
						</div>
						{email && <div class="text-xs text-gray-500 truncate">{email}</div>}
					</div>
					<button
						type="button"
						onClick={async () => {
							setMenuOpen(false);
							const clerk = (window as unknown as {
								Clerk?: { signOut?: () => Promise<void> };
							}).Clerk;
							if (clerk?.signOut) await clerk.signOut();
						}}
						class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
					>
						Cerrar sesión
					</button>
				</div>
			)}
		</div>
	);
}

/**
 * Sign-in button. We use Clerk's own `Clerk.signIn` redirect (it opens
 * the hosted sign-in page). We intentionally avoid Clerk's prebuilt
 * `<SignInButton />` component here because it pulls additional Clerk
 * UI that adds bundle weight — a plain button calling the imperative
 * API is enough.
 */
function SignInButton() {
	const handleClick = () => {
		const clerk = (window as unknown as {
			Clerk?: {
				openSignIn?: (opts?: { redirectUrl?: string }) => void;
			};
		}).Clerk;
		if (clerk?.openSignIn) {
			clerk.openSignIn({ redirectUrl: window.location.pathname });
		}
	};
	return (
		<button
			type="button"
			onClick={handleClick}
			class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
		>
			Iniciar sesión
		</button>
	);
}
