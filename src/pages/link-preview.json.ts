import { getCollection } from 'astro:content';

export async function GET() {
  const notes = await getCollection('notes');
  let blog: any[] = [];
  try { blog = await getCollection('blog'); } catch (e) {}

  const previewMap: Record<string, any> = {};

  notes.forEach(note => {
    previewMap[`/notes/${note.slug}`] = {
      title: note.data.title,
      description: note.data.description || '',
      tags: note.data.tags || [],
      date: note.data.pubDate.toISOString().split('T')[0],
    };
  });

  blog.filter(p => !p.data.draft).forEach(post => {
    previewMap[`/blog/${post.slug}`] = {
      title: post.data.title,
      description: post.data.description || '',
      tags: post.data.tags || [],
      date: post.data.pubDate.toISOString().split('T')[0],
    };
  });

  return new Response(JSON.stringify(previewMap), {
    headers: { 'Content-Type': 'application/json' },
  });
}
