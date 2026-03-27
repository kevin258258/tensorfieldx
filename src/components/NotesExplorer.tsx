import React, { useState, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const KnowledgeGraph = lazy(() => import('./KnowledgeGraph'));

interface Note {
  slug: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    tags: string[];
    series?: string;
    seriesOrder?: number;
  };
}

interface Props {
  notes: Note[];
}

export default function NotesExplorer({ notes }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  const { seriesGroups, singles } = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    const singleItems: Note[] = [];

    notes.forEach(note => {
      const seriesName = note.data.series;
      if (seriesName) {
        if (!groups[seriesName]) groups[seriesName] = [];
        groups[seriesName].push(note);
      } else {
        singleItems.push(note);
      }
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.data.seriesOrder || 0) - (b.data.seriesOrder || 0));
    });

    return { seriesGroups: groups, singles: singleItems };
  }, [notes]);

  return (
    <div className="w-full min-h-[400px]">

      <div className="flex justify-end mb-8 border-b pb-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex gap-1 text-xs font-sans">
          <button
            onClick={() => setViewMode('list')}
            className="px-3 py-1.5 rounded-md transition-colors"
            style={{
              color: viewMode === 'list' ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))',
              backgroundColor: viewMode === 'list' ? 'rgb(var(--color-accent) / 0.08)' : 'transparent',
            }}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className="px-3 py-1.5 rounded-md transition-colors"
            style={{
              color: viewMode === 'graph' ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))',
              backgroundColor: viewMode === 'graph' ? 'rgb(var(--color-accent) / 0.08)' : 'transparent',
            }}
          >
            Graph
          </button>
        </div>
      </div>

      <div className="relative">
        {viewMode === 'list' ? (
          <div className="space-y-1">
            {Object.entries(seriesGroups).map(([seriesName, seriesNotes]) => (
              <SeriesFolder key={seriesName} title={seriesName} notes={seriesNotes} />
            ))}
            {singles.map((note) => (
              <NoteItem key={note.slug} note={note} />
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-64" style={{ color: 'rgb(var(--color-muted))' }}>
                <span className="font-mono text-xs">Loading graph...</span>
              </div>
            }>
              <KnowledgeGraph notes={notes} />
            </Suspense>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SeriesFolder({ title, notes }: { title: string, notes: Note[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgb(var(--color-border))' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left group"
        style={{ backgroundColor: isOpen ? 'rgb(var(--color-accent) / 0.04)' : 'transparent' }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary) / 0.02)'; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <svg
          className="w-4 h-4 transition-transform"
          style={{ color: isOpen ? 'rgb(var(--color-accent))' : 'rgb(var(--color-muted))', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span
          className="font-display text-base font-semibold flex-1"
          style={{ color: isOpen ? 'rgb(var(--color-primary))' : 'rgb(var(--color-secondary))' }}
        >
          {title}
        </span>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ color: 'rgb(var(--color-muted))', backgroundColor: 'rgb(var(--color-primary) / 0.04)' }}>
          {notes.length}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ borderTop: '1px solid rgb(var(--color-border))' }}
          >
            {notes.map(note => (
              <NoteItem key={note.slug} note={note} isChild />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NoteItem({ note, isChild = false }: { note: Note, isChild?: boolean }) {
  return (
    <a
      href={`/notes/${note.slug}`}
      className="flex items-baseline gap-4 py-3 transition-colors rounded-md px-4"
      style={{ paddingLeft: isChild ? '3rem' : '1rem' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent) / 0.05)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <span className="font-mono text-[11px] w-24 shrink-0" style={{ color: 'rgb(var(--color-muted))' }}>
        {new Date(note.data.pubDate).toISOString().split('T')[0]}
      </span>
      <span className="font-body text-[15px]" style={{ color: 'rgb(var(--color-primary) / 0.85)' }}>
        {note.data.title}
      </span>
      {isChild && note.data.seriesOrder && (
        <span className="text-[10px] font-mono ml-auto" style={{ color: 'rgb(var(--color-muted))' }}>
          #{note.data.seriesOrder}
        </span>
      )}
    </a>
  );
}
