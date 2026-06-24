"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from "react-force-graph-2d";

type GraphNode = {
  id: string;
  title: string;
  linkCount: number;
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  type: "manual" | "ai";
  strength: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type Props = { activeNoteId?: string };

export function GraphView({ activeNoteId }: Props) {
  const router = useRouter();
  const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    });
    obs.observe(el);
    setDimensions({ width: el.clientWidth, height: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // Fetch graph data
  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then((data: GraphData) => {
        setGraphData(data);
        setLoading(false);
      });
  }, []);

  // Centre on active note after data loads
  useEffect(() => {
    if (!activeNoteId || !fgRef.current || graphData.nodes.length === 0) return;
    const node = graphData.nodes.find((n) => n.id === activeNoteId);
    if (node?.x != null && node?.y != null) {
      setTimeout(() => {
        fgRef.current?.centerAt(node.x, node.y, 600);
        fgRef.current?.zoom(2.5, 600);
      }, 600);
    }
  }, [activeNoteId, graphData]);

  const nodeColor = useCallback(
    (node: GraphNode) => {
      if (node.id === activeNoteId) return "#a78bfa"; // purple — current note
      if (node.id === hoveredNode) return "#60a5fa";  // blue — hovered
      return node.linkCount > 3 ? "#34d399" : "#94a3b8"; // green hub vs grey leaf
    },
    [activeNoteId, hoveredNode]
  );

  const nodeRelSize = 5;

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = Math.sqrt(Math.max(1, node.linkCount)) * nodeRelSize * 0.7 + 3;
      // Glow for active/hovered
      if (node.id === activeNoteId || node.id === hoveredNode) {
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
        ctx.fillStyle =
          node.id === activeNoteId ? "rgba(167,139,250,0.25)" : "rgba(96,165,250,0.2)";
        ctx.fill();
      }
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor(node);
      ctx.fill();

      // Label — only show when zoomed in enough or when hovered/active
      const showLabel = globalScale > 1.2 || node.id === activeNoteId || node.id === hoveredNode;
      if (showLabel) {
        const fontSize = Math.max(10, 14 / globalScale);
        ctx.font = `${node.id === activeNoteId ? "600 " : ""}${fontSize}px Inter, sans-serif`;
        ctx.fillStyle =
          node.id === activeNoteId ? "#e2e8f0" : node.id === hoveredNode ? "#cbd5e1" : "#94a3b8";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.title, node.x ?? 0, (node.y ?? 0) + r + 3);
      }
    },
    [nodeColor, activeNoteId, hoveredNode]
  );

  const linkColor = useCallback((link: GraphLink) => {
    return link.type === "manual"
      ? "rgba(148,163,184,0.5)"
      : `rgba(139,92,246,${0.2 + (link.strength ?? 0) * 0.6})`;
  }, []);

  const linkWidth = useCallback((link: GraphLink) => {
    return link.type === "manual" ? 1.5 : 1 + (link.strength ?? 0) * 2;
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      router.push(`/notes/${node.id}`);
    },
    [router]
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node?.id ?? null);
    if (typeof document !== "undefined") {
      document.body.style.cursor = node ? "pointer" : "default";
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#0f1117]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Loading graph…
        </div>
      )}

      {!loading && graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
            <circle cx="12" cy="12" r="3" />
            <circle cx="4" cy="6" r="2" />
            <circle cx="20" cy="6" r="2" />
            <circle cx="4" cy="18" r="2" />
            <circle cx="20" cy="18" r="2" />
            <line x1="12" y1="9" x2="5.5" y2="7" />
            <line x1="12" y1="9" x2="18.5" y2="7" />
            <line x1="12" y1="15" x2="5.5" y2="17" />
            <line x1="12" y1="15" x2="18.5" y2="17" />
          </svg>
          <p className="text-sm">No notes yet. Create some notes to see the graph.</p>
        </div>
      )}

      {!loading && graphData.nodes.length > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeId="id"
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => "replace"}
          nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
            const r = Math.sqrt(Math.max(1, node.linkCount)) * nodeRelSize * 0.7 + 3;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={(link: GraphLink) => link.type === "manual" ? 1.5 : 1}
          linkDirectionalParticleColor={(link: GraphLink) =>
            link.type === "manual" ? "rgba(148,163,184,0.8)" : "rgba(167,139,250,0.8)"
          }
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          backgroundColor="#0f1117"
          cooldownTicks={120}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      )}

      {/* Legend */}
      {!loading && graphData.nodes.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-slate-400/50 inline-block" />
            Manual link
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-violet-400/70 inline-block" />
            AI discovered
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-violet-400 inline-block" />
            Current note
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
            Hub (many links)
          </div>
          <div className="mt-1 pt-1 border-t border-white/10 text-slate-500">
            Click to open · Scroll to zoom
          </div>
        </div>
      )}
    </div>
  );
}
