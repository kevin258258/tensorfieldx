import { defineCollection, z } from 'astro:content';

const notesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        summary: z.string().optional(),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        tags: z.array(z.string()).optional(),
        series: z.string().optional(),
        seriesOrder: z.number().optional(),
        image: z.string().optional(),
    }),
});

const projectsCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        tags: z.array(z.string()),
        status: z.enum(['dev', 'stable', 'archived']).default('stable'),
        github: z.string().optional(),
        demo: z.string().optional(),
        image: z.string().optional(),
    }),
});

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        tags: z.array(z.string()).optional(),
        image: z.string().optional(),
        draft: z.boolean().default(false),
    }),
});

const publicationsCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        authors: z.array(z.string()),
        venue: z.string(),
        year: z.number(),
        doi: z.string().optional(),
        pdf: z.string().optional(),
        abstract: z.string().optional(),
        tags: z.array(z.string()).optional(),
    }),
});

const seriesCollection = defineCollection({
    type: 'data',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        status: z.enum(['ongoing', 'complete']).default('ongoing'),
        prerequisites: z.string().optional(),
        order: z.number().default(99),
        featured: z.boolean().default(false),
        plannedChapters: z.number().optional(),
    }),
});

export const collections = {
    'notes': notesCollection,
    'projects': projectsCollection,
    'blog': blogCollection,
    'publications': publicationsCollection,
    'series': seriesCollection,
};
