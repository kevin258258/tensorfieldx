import { defineCollection, z } from 'astro:content';

const notesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        tags: z.array(z.string()).optional(),
        
        // --- 关键新增字段 ---
        // 告诉 Astro 这些字段是存在的，且是可选的
        series: z.string().optional(),       // 系列名称
        seriesOrder: z.number().optional(),  // 系列内的顺序
        // ------------------
        
        image: z.string().optional(),
    }),
});
const projectsCollection = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        tags: z.array(z.string()),     // 技术栈标签
        status: z.enum(['dev', 'stable', 'archived']).default('stable'), // 项目状态
        github: z.string().optional(), // GitHub 链接
        demo: z.string().optional(),   // 演示地址
        image: z.string().optional(),  // 项目封面图 (可选)
    }),
});

export const collections = {
    'notes': notesCollection,
	'projects': projectsCollection, // 注册 projects，注意是 projects 不是 projetcs
};