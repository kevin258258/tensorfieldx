import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const notes = await getCollection('notes');
  let blog: any[] = [];
  try { blog = await getCollection('blog'); } catch (e) {}

  const allItems = [...notes, ...blog.filter(p => !p.data.draft)]
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'TensorFieldX',
    description: 'Notes and writings by Feixiang Tao on physics, mathematics, and computer science.',
    site: context.site!,
    items: allItems.map((item) => ({
      title: item.data.title,
      pubDate: item.data.pubDate,
      description: item.data.description,
      link: item.collection === 'blog' ? `/blog/${item.slug}/` : `/notes/${item.slug}/`,
    })),
  });
}
