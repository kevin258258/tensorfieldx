import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface Props {
  notes: any[];
}

export default function KnowledgeGraph({ notes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 500 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        w: containerRef.current.offsetWidth,
        h: 500
      });
    }
  }, []);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    notes.forEach(note => {
      nodes.push({
        id: note.slug,
        name: note.data.title,
        group: note.data.tags?.[0] || 'Uncategorized',
        val: 1
      });
    });

    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i];
        const b = notes[j];
        if (a.data.series && b.data.series && a.data.series === b.data.series) {
          links.push({ source: a.slug, target: b.slug, value: 3 });
        }
        const commonTags = a.data.tags?.filter((t: string) => b.data.tags?.includes(t));
        if (commonTags && commonTags.length > 0) {
          links.push({ source: a.slug, target: b.slug, value: 1 });
        }
      }
    }

    return { nodes, links };
  }, [notes]);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const nodeColor = isDark ? '#E4E2DE' : '#1A1A1A';
  const linkColor = isDark ? 'rgba(100, 149, 237, 0.2)' : 'rgba(43, 91, 220, 0.15)';
  const particleColor = isDark ? '#6495ED' : '#2B5BDC';

  return (
    <div ref={containerRef} className="rounded-lg overflow-hidden relative" style={{ border: '1px solid rgb(var(--color-border))' }}>
      <div className="absolute top-3 left-3 z-10 pointer-events-none font-mono text-[10px]" style={{ color: 'rgb(var(--color-muted))' }}>
        {graphData.nodes.length} nodes · {graphData.links.length} links
      </div>

      <ForceGraph2D
        width={dimensions.w}
        height={dimensions.h}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel="name"
        nodeColor={() => nodeColor}
        nodeRelSize={4}
        linkColor={() => linkColor}
        linkWidth={(link: any) => link.value}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => particleColor}
        onNodeClick={(node: any) => {
          window.location.href = `/notes/${node.id}`;
        }}
      />
    </div>
  );
}
