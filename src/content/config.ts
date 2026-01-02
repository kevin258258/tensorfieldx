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

export const collections = {
    'notes': notesCollection,
};