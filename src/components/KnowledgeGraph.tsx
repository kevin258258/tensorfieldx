import React, { useMemo, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// 强制设置为客户端组件，因为 Canvas 依赖 window 对象
// 实际上在父组件调用时我们要用 client:only="react"

interface Props {
  notes: any[];
}

export default function KnowledgeGraph({ notes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ w: 800, h: 600 });

  // 监听窗口大小
  useEffect(() => {
    if (containerRef.current) {
        setDimensions({
            w: containerRef.current.offsetWidth,
            h: 600 // 固定高度或者根据视口调整
        });
    }
  }, []);

  // --- 核心逻辑：生成图谱数据 ---
  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    // 1. 生成节点
    notes.forEach(note => {
      nodes.push({
        id: note.slug,
        name: note.data.title,
        group: note.data.tags?.[0] || 'Uncategorized', // 用第一个标签作为分组颜色依据
        val: 1 // 节点大小
      });
    });

    // 2. 生成连线 (逻辑：同标签的连线，同系列的连线)
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i];
        const b = notes[j];

        // 规则 A: 同一系列必然相连 (强连接)
        if (a.data.series && b.data.series && a.data.series === b.data.series) {
          links.push({ source: a.slug, target: b.slug, value: 3 }); // 粗线
        }
        
        // 规则 B: 拥有相同的标签 (弱连接)
        const commonTags = a.data.tags?.filter((t: string) => b.data.tags?.includes(t));
        if (commonTags && commonTags.length > 0) {
          links.push({ source: a.slug, target: b.slug, value: 1 }); // 细线
        }
      }
    }

    return { nodes, links };
  }, [notes]);

  return (
    <div ref={containerRef} className="border border-white/10 bg-black/40 rounded-lg overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 font-mono text-xs text-gray-500 pointer-events-none">
            :: GRAPH_MODE_ACTIVE <br/>
            NODES: {graphData.nodes.length} / LINKS: {graphData.links.length}
        </div>
        
        <ForceGraph2D
            width={dimensions.w}
            height={dimensions.h}
            graphData={graphData}
            
            // --- 视觉样式 (Tech-Noir 风格) ---
            backgroundColor="rgba(0,0,0,0)" // 透明背景
            nodeLabel="name"
            nodeColor={() => "#ffffff"} // 节点全白
            nodeRelSize={4}
            
            linkColor={() => "rgba(46, 92, 255, 0.2)"} // 连线：微弱的瑞士蓝
            linkWidth={link => link.value} // 权重越大线越粗
            
            // 粒子效果
            linkDirectionalParticles={2} // 每个连接上有粒子在跑
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => "accent"} // 粒子颜色使用强调色
            
            // 点击交互
            onNodeClick={(node: any) => {
                window.location.href = `/notes/${node.id}`;
            }}
        />
    </div>
  );
}