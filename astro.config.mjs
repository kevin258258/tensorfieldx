import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind'; // 确保这一行有

// 1. 引入刚才下载的数学插件
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
	// 这里改成你之前决定的 GitHub Page 地址
	site: 'https://tensorfieldx.vercel.app',
	base: '/',

	integrations: [
		mdx(),
		sitemap(),
		tailwind(), // 启用 Tailwind CSS
	],

	markdown: {
		// 2. 在这里告诉 Astro 处理 Markdown 时要把公式渲染出来
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex],
	},
});