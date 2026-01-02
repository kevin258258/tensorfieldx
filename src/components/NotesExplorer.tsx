import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileText, ChevronRight, ChevronDown, Network } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph'; // 下一步我们会创建这个

// 数据接口定义
interface Note {
  slug: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    tags: string[];
    series?: string;      // 新增
    seriesOrder?: number; // 新增
  };
}

interface Props {
  notes: Note[];
}

export default function NotesExplorer({ notes }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  
  // --- 核心逻辑：数据分组 (Grouping) ---
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

    // 对系列内文章进行排序 (按 seriesOrder 或 日期)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.data.seriesOrder || 0) - (b.data.seriesOrder || 0));
    });

    return { seriesGroups: groups, singles: singleItems };
  }, [notes]);

  return (
    <div className="w-full min-h-[500px]">
      
      {/* 顶部工具栏：视图切换 */}
      <div className="flex justify-end mb-8 border-b border-white/10 pb-4">
        <div className="flex gap-4 font-mono text-xs">
           <button 
             onClick={() => setViewMode('list')}
             className={`flex items-center gap-2 px-3 py-1 transition-colors ${viewMode === 'list' ? 'text-accent bg-white/5 border border-accent/30' : 'text-gray-500 hover:text-white'}`}
           >
             <FileText className="w-3 h-3" /> LIST_VIEW
           </button>
           <button 
             onClick={() => setViewMode('graph')}
             className={`flex items-center gap-2 px-3 py-1 transition-colors ${viewMode === 'graph' ? 'text-accent bg-white/5 border border-accent/30' : 'text-gray-500 hover:text-white'}`}
           >
             <Network className="w-3 h-3" /> GRAPH_VIEW
           </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="relative">
        {viewMode === 'list' ? (
          <div className="space-y-2">
            
            {/* 1. 先渲染系列 (Folders) */}
            {Object.entries(seriesGroups).map(([seriesName, seriesNotes]) => (
              <SeriesFolder key={seriesName} title={seriesName} notes={seriesNotes} />
            ))}

            {/* 2. 再渲染单篇 (Files) */}
            {singles.map((note) => (
              <NoteItem key={note.slug} note={note} />
            ))}
            
          </div>
        ) : (
          // Graph View (懒加载以提升性能)
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <KnowledgeGraph notes={notes} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// 子组件：系列文件夹 (带折叠动画)
function SeriesFolder({ title, notes }: { title: string, notes: Note[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/5 rounded bg-white/[0.02] overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 transition-colors text-left group"
      >
        <Folder className={`w-4 h-4 transition-colors ${isOpen ? 'text-accent' : 'text-gray-500 group-hover:text-white'}`} />
        <span className={`font-serif text-lg font-bold flex-1 ${isOpen ? 'text-white' : 'text-gray-300'}`}>
          {title}
        </span>
        <span className="font-mono text-xs text-gray-600 border border-gray-800 px-2 rounded-full">
          {notes.length} ITEMS
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-white/5"
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

// 子组件：单篇文章
function NoteItem({ note, isChild = false }: { note: Note, isChild?: boolean }) {
  return (
    <a 
      href={`/notes/${note.slug}`}
      className={`block group flex items-baseline gap-4 py-3 border-b border-white/5 hover:bg-accent/10 transition-colors px-4 ${isChild ? 'pl-12 bg-black/20' : ''}`}
    >
      <span className="font-mono text-xs text-gray-600 w-24 shrink-0">
        {new Date(note.data.pubDate).toISOString().split('T')[0]}
      </span>
      <h3 className="font-serif text-base text-gray-300 group-hover:text-white group-hover:translate-x-1 transition-all">
        {note.data.title}
      </h3>
      {isChild && <span className="text-xs text-gray-600 ml-auto">PART {note.data.seriesOrder}</span>}
    </a>
  );
}