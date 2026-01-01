// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// 定义 'notes' 集合的数据结构
const notesCollection = defineCollection({
	type: 'content', // 指明这是内容集合（Markdown/MDX）
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		tags: z.array(z.string()).optional(), // 允许标签，比如 ['MATH', 'CS']
	}),
});

// 导出集合（必须叫 collections）
export const collections = {
	'notes': notesCollection,
};