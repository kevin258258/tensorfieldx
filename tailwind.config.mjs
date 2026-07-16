/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				paper: 'rgb(var(--color-paper) / <alpha-value>)',
				surface: 'rgb(var(--color-surface) / <alpha-value>)',
				primary: 'rgb(var(--color-primary) / <alpha-value>)',
				secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
				muted: 'rgb(var(--color-muted) / <alpha-value>)',
				accent: 'rgb(var(--color-accent) / <alpha-value>)',
				'accent-warm': 'rgb(var(--color-accent-warm) / <alpha-value>)',
				lav: 'rgb(var(--color-lav) / <alpha-value>)',
				edge: 'rgb(var(--color-border) / <alpha-value>)',
			},
			fontFamily: {
				display: ['"Playfair Display"', 'Georgia', 'serif'],
				body: ['"Source Serif 4"', 'Georgia', 'serif'],
				sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'monospace'],
			},
			typography: {
				DEFAULT: {
					css: {
						'--tw-prose-body': 'rgb(var(--color-primary) / 0.85)',
						'--tw-prose-headings': 'rgb(var(--color-primary))',
						'--tw-prose-lead': 'rgb(var(--color-secondary))',
						'--tw-prose-links': 'rgb(var(--color-accent))',
						'--tw-prose-bold': 'rgb(var(--color-primary))',
						'--tw-prose-counters': 'rgb(var(--color-secondary))',
						'--tw-prose-bullets': 'rgb(var(--color-accent))',
						'--tw-prose-hr': 'rgb(var(--color-border))',
						'--tw-prose-quotes': 'rgb(var(--color-secondary))',
						'--tw-prose-quote-borders': 'rgb(var(--color-accent) / 0.3)',
						'--tw-prose-captions': 'rgb(var(--color-secondary))',
						'--tw-prose-code': 'rgb(var(--color-primary))',
						'--tw-prose-pre-code': 'rgb(var(--color-primary) / 0.85)',
						'--tw-prose-pre-bg': 'rgb(var(--color-surface))',
						'--tw-prose-th-borders': 'rgb(var(--color-border))',
						'--tw-prose-td-borders': 'rgb(var(--color-border) / 0.5)',
					},
				},
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}
