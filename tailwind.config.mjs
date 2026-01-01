/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// 背景：维持虚空黑
				'void': '#050505', 
				
                // 强调色：切伦科夫蓝 (Cherenkov Blue) / 科学蓝
                // 这种蓝在黑色上非常清晰，且不像绿色那么"黑客帝国"，不像红色那么"报警"
				'accent': '#3B82F6', 
                'accent-dark': '#1D4ED8', // 深一点的蓝，用于边框

				// 文字分级 (大幅提亮)
                'ink': '#E5E5E5',       // 正文：接近纯白，极高对比度
				'concrete': '#A3A3A3',  // 辅助信息：浅灰，不再是暗灰
			},
			fontFamily: {
				serif: ['"Playfair Display"', 'serif'],
				mono: ['"JetBrains Mono"', 'monospace'],
			},
			backgroundImage: {
				'void-gradient': 'radial-gradient(circle at 50% 0%, #1a1a1a 0%, #050505 100%)',
			}
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}