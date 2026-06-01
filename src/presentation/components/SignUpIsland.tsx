import { SignUp } from '@clerk/clerk-react';
import ClerkProviderWrapper from '../../infrastructure/auth/ClerkProviderWrapper';

/**
 * Preact island that mounts Clerk's path-based `<SignUp />` component
 * inside the `<ClerkProvider>`. This is the entry point mounted from
 * `src/pages/sign-up.astro` with `client:only="preact"`.
 *
 * Why a Preact island (not raw Astro)?
 * - Clerk's React components require React/Preact context, which Astro
 *   layout components do not provide. The provider must live inside the
 *   Preact tree.
 * - `client:only="preact"` skips SSR (Clerk needs the browser) and lets
 *   the user see a real, interactive sign-up form.
 *
 * Route configuration is sourced from the same values documented in
 * `.env.example` (`/sign-in`, `/sign-up`, `/`). The Clerk components
 * cross-link to each other and redirect to `/` after a successful flow.
 *
 * NOTE: `<SignUp />` does NOT accept a `signUpUrl` prop (it would be
 * self-referential — the "Sign up" link is only present on `<SignIn />`).
 * It only accepts `signInUrl` to cross-link to the sign-in page.
 *
 * We use the modern (non-deprecated) Clerk redirect props:
 * - `forceRedirectUrl` — where to send the user on successful sign-up.
 * - `fallbackRedirectUrl` — fallback when the primary URL is unsafe.
 */
export default function SignUpIsland() {
	return (
		<ClerkProviderWrapper
			signInUrl="/sign-in"
			signUpUrl="/sign-up"
			afterSignInUrl="/"
			afterSignUpUrl="/"
		>
			<div class="flex justify-center py-8">
				<SignUp
					routing="path"
					path="/sign-up"
					signInUrl="/sign-in"
					forceRedirectUrl="/"
					fallbackRedirectUrl="/"
				/>
			</div>
		</ClerkProviderWrapper>
	);
}
