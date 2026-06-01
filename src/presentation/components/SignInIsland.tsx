import { SignIn } from '@clerk/clerk-react';
import ClerkProviderWrapper from '../../infrastructure/auth/ClerkProviderWrapper';

/**
 * Preact island that mounts Clerk's path-based `<SignIn />` component
 * inside the `<ClerkProvider>`. This is the entry point mounted from
 * `src/pages/sign-in.astro` with `client:only="preact"`.
 *
 * Why a Preact island (not raw Astro)?
 * - Clerk's React components require React/Preact context, which Astro
 *   layout components do not provide. The provider must live inside the
 *   Preact tree.
 * - `client:only="preact"` skips SSR (Clerk needs the browser) and lets
 *   the user see a real, interactive sign-in form.
 *
 * Route configuration is sourced from the same values documented in
 * `.env.example` (`/sign-in`, `/sign-up`, `/`). The Clerk components
 * cross-link to each other and redirect to `/` after a successful flow.
 *
 * We use the modern (non-deprecated) Clerk redirect props:
 * - `forceRedirectUrl` — where to send the user on successful sign-in.
 * - `fallbackRedirectUrl` — fallback when the primary URL is unsafe.
 * - `signUpForceRedirectUrl` / `signUpFallbackRedirectUrl` — same, but
 *   for the case where the user clicks "Sign up" from the sign-in page.
 */
export default function SignInIsland() {
	return (
		<ClerkProviderWrapper
			signInUrl="/sign-in"
			signUpUrl="/sign-up"
			afterSignInUrl="/"
			afterSignUpUrl="/"
		>
			<div class="flex justify-center py-8">
				<SignIn
					routing="path"
					path="/sign-in"
					signInUrl="/sign-in"
					signUpUrl="/sign-up"
					forceRedirectUrl="/"
					fallbackRedirectUrl="/"
					signUpForceRedirectUrl="/"
					signUpFallbackRedirectUrl="/"
				/>
			</div>
		</ClerkProviderWrapper>
	);
}
