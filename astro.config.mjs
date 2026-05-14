import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';

export default defineConfig({
	site: 'https://dekuw.github.io',
	integrations: [
		tailwind(),
		preact({ compat: true }),
	],
	output: 'static',
	build: {
		format: 'file',
	},
});