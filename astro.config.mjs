import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';

export default defineConfig({
	site: 'https://ScissorSevens.github.io',
	base: '/finance-dashboard',
	integrations: [
		tailwind(),
		preact({ compat: true }),
	],
	output: 'static',
	build: {
		format: 'file',
	},
	// Astro 5 defaults `envPrefix` to `PUBLIC_` only. Vite's default also
	// includes `VITE_`, so we explicitly add it back so that
	// `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` etc. are statically
	// replaced at build time. Combined with `staticImportMetaEnv`, this
	// matches the legacy Vite behavior.
	vite: {
		envPrefix: ['PUBLIC_', 'VITE_'],
	},
	experimental: {
		staticImportMetaEnv: true,
	},
});