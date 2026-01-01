// src/pages/link-preview.json.ts
import { getCollection } from 'astro:content';

export async function GET() {
  const notes = await getCollection('notes');
  
  // 构建一个 Map: { "/tensorfieldx/notes/slug": { title, desc, ... } }
  // 这样前端查表速度是 O(1)
  const previewMap = {};

  notes.forEach(note => {
    // 注意：这里要匹配你实际生成的 URL 路径
    const url = `/tensorfieldx/notes/${note.slug}`;
    previewMap[url] = {
      title: note.data.title,
      description: note.data.description || "No description provided.",
      tags: note.data.tags || [],
      date: note.data.pubDate.toISOString().split('T')[0]
    };
  });

  // 如果你有 Projects 集合，也可以在这里加进去

  return new Response(JSON.stringify(previewMap), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}