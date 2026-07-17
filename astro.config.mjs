import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
	site: 'https://tensorfieldx.space',
	base: '/',
	integrations: [
		mdx(),
		sitemap(),
		tailwind(),
	],
	prefetch: {
		defaultStrategy: 'hover',
		prefetchAll: false,
	},
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex],
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			transformers: [
				{
					// expose the language on <pre data-lang> so CSS can render a label
					name: 'lang-label',
					pre(node) {
						const lang = this.options.lang;
						if (lang && !['text', 'plaintext', 'ansi', 'console'].includes(lang)) {
							node.properties['data-lang'] = lang;
						}
					},
				},
			],
		},
	},
});
