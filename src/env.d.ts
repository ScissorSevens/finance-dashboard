/// <reference types="astro/client" />

interface ImportMetaEnv {
	/**
	 * Clerk publishable key (browser-safe).
	 * Used by `@clerk/clerk-react` ClerkProvider to identify the Clerk instance.
	 */
	readonly VITE_CLERK_PUBLISHABLE_KEY: string;

	/**
	 * Supabase project URL.
	 * Used to construct the Supabase client (`createClient(VITE_SUPABASE_URL, ...)`).
	 */
	readonly VITE_SUPABASE_URL: string;

	/**
	 * Supabase anon key (browser-safe, subject to RLS).
	 * Used to authenticate anonymous requests to Supabase.
	 */
	readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
