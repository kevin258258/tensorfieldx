/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// 背景：维持虚空黑
				'void': '#050508', 
				
                // 核心改动：瑞士蓝 / OYU蓝 (Swiss Blue / Azure)
                // 比之前的 #0044CC 更亮，更有呼吸感，符合图二的色调
				'accent': '#6495ED', 
                
				// 文字：
                // Ink: 霜白，在黑底上清晰锐利
                'ink': '#F0F0F0',       
                // Concrete: 钛银色，用于辅助信息
				'concrete': 'rgba(255, 255, 255, 1)',  
			},
			fontFamily: {
				serif: ['"Playfair Display"', 'serif'],
				mono: ['"JetBrains Mono"', 'monospace'],
			},
			backgroundImage: {
				'void-gradient': 'radial-gradient(circle at 50% 0%, #0f1218 0%, #050508 100%)',
			}
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}