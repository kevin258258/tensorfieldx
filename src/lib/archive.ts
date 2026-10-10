import { getCollection } from 'astro:content';
import { readMin } from './series';

export interface ArchiveEntry {
  title: string;
  href: string;
  year: number;
  category: 'Blog' | 'Notes' | 'Projects';
  description: string;
  tags: string[];
  image?: string;
  date: number;
  min?: number;
}

export async function getArchiveEntries(): Promise<ArchiveEntry[]> {
  const [notes, posts, projects] = await Promise.all([
    getCollection('notes'),
    getCollection('blog', ({ data }) => !data.draft && data.lang !== 'en'),
    getCollection('projects'),
  ]);
  return [
    ...notes.map(note => ({ ...note.data, href: `/notes/${note.slug}`, category: 'Notes' as const, year: note.data.pubDate.getFullYear(), date: note.data.pubDate.valueOf(), tags: note.data.tags ?? [], min: readMin(note.body) })),
    ...posts.map(post => ({ ...post.data, href: `/blog/${post.slug}`, category: 'Blog' as const, year: post.data.pubDate.getFullYear(), date: post.data.pubDate.valueOf(), tags: post.data.tags ?? [], min: readMin(post.body) })),
    ...projects.map(project => ({ ...project.data, href: project.data.demo || project.data.github || '/projects', category: 'Projects' as const, year: project.data.pubDate.getFullYear(), date: project.data.pubDate.valueOf(), tags: project.data.tags ?? [] })),
  ].sort((a, b) => b.date - a.date);
}
