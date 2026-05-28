import { useState, useRef, useEffect } from "react";

const NODE_W = 140;
const NODE_H = 52;

interface TreeNode {
  id: number;
  description: string;
  x: number;
  y: number;
}

interface TreeLink {
  id: number;
  fromId: number;
  toId: number;
}

// Three-state linking machine:
//   idle         → not in link mode
//   source       → clicked "link" button, waiting for first node click
//   target+id    → first node selected, waiting for second node click
type LinkPhase =
  | { phase: "idle" }
  | { phase: "source" }
  | { phase: "target"; sourceId: number };

export default function TreeTab() {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [links, setLinks] = useState<TreeLink[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [toolMode, setToolMode] = useState<"select" | "pan">("select");
  const [linkPhase, setLinkPhase] = useState<LinkPhase>({ phase: "idle" });
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const panningRef = useRef(false);
  const panStartRef = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const panMovedRef = useRef(false);
  const draggingRef = useRef<{
    id: number; mx: number; my: number; nx: number; ny: number;
  } | null>(null);

  function getWrapperSize() {
    const r = wrapperRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 800, h: r?.height ?? 600 };
  }

  // Place a new node at the center of the current viewport
  function addNode() {
    const { w, h } = getWrapperSize();
    const cx = (w / 2 - pan.x) / zoom;
    const cy = (h / 2 - pan.y) / zoom;
    setNodes(prev => [...prev, {
      id: Date.now(),
      description: "",
      x: cx - NODE_W / 2,
      y: cy - NODE_H / 2,
    }]);
  }

  function handleWrapperPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    panMovedRef.current = false;
    if (toolMode === "pan") {
      panningRef.current = true;
      panStartRef.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }

  function handleWrapperPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (panningRef.current) {
      panMovedRef.current = true;
      setPan({
        x: panStartRef.current.ox + (e.clientX - panStartRef.current.px),
        y: panStartRef.current.oy + (e.clientY - panStartRef.current.py),
      });
      return;
    }
    if (draggingRef.current) {
      const d = draggingRef.current;
      setNodes(prev => prev.map(n => n.id === d.id ? {
        ...n,
        x: d.nx + (e.clientX - d.mx) / zoom,
        y: d.ny + (e.clientY - d.my) / zoom,
      } : n));
    }
  }

  function handleWrapperPointerUp() {
    panningRef.current = false;
    draggingRef.current = null;
  }

  function handleNodePointerDown(e: React.PointerEvent<HTMLDivElement>, node: TreeNode) {
    if (linkPhase.phase !== "idle" || toolMode !== "select") return;
    e.stopPropagation();
    draggingRef.current = { id: node.id, mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
    wrapperRef.current?.setPointerCapture(e.pointerId);
  }

  function handleNodeClick(e: React.MouseEvent, nodeId: number) {
    if (linkPhase.phase === "idle") return;
    e.stopPropagation();
    if (linkPhase.phase === "source") {
      setLinkPhase({ phase: "target", sourceId: nodeId });
    } else {
      if (linkPhase.sourceId !== nodeId) {
        const dup = links.some(l =>
          (l.fromId === linkPhase.sourceId && l.toId === nodeId) ||
          (l.fromId === nodeId && l.toId === linkPhase.sourceId)
        );
        if (!dup) {
          setLinks(prev => [...prev, { id: Date.now(), fromId: linkPhase.sourceId, toId: nodeId }]);
        }
      }
      setLinkPhase({ phase: "idle" });
    }
  }

  function deleteNode(id: number) {
    setNodes(prev => prev.filter(n => n.id !== id));
    setLinks(prev => prev.filter(l => l.fromId !== id && l.toId !== id));
  }

  // Zoom centered on the viewport midpoint using functional setters to avoid stale closures
  function changeZoom(delta: number) {
    const { w, h } = getWrapperSize();
    const cx = w / 2, cy = h / 2;
    setZoom(prev => {
      const next = Math.min(3, Math.max(0.2, prev + delta));
      setPan(p => ({
        x: cx - (cx - p.x) * (next / prev),
        y: cy - (cy - p.y) * (next / prev),
      }));
      return next;
    });
  }

  // Wheel zoom — must be non-passive to call preventDefault
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      changeZoom(e.deltaY < 0 ? 0.1 : -0.1);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []); // safe: changeZoom uses only functional setters and a ref

  useEffect(() => {
    if (editingNodeId !== null) {
      const el = inputRefs.current.get(editingNodeId);
      if (el) { el.focus(); el.select(); }
    }
  }, [editingNodeId]);

  // Returns the bezier path and its visual midpoint (t=0.5 for these S-curves = anchor midpoint)
  function getLinkGeometry(link: TreeLink): { path: string; midX: number; midY: number } | null {
    const from = nodes.find(n => n.id === link.fromId);
    const to = nodes.find(n => n.id === link.toId);
    if (!from || !to) return null;
    const fx = from.x + NODE_W / 2, fy = from.y + NODE_H / 2;
    const tx = to.x + NODE_W / 2, ty = to.y + NODE_H / 2;
    let x1: number, y1: number, x2: number, y2: number;
    let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
    if (Math.abs(tx - fx) >= Math.abs(ty - fy)) {
      if (tx > fx) { x1 = from.x + NODE_W; y1 = fy; x2 = to.x; y2 = ty; }
      else          { x1 = from.x;          y1 = fy; x2 = to.x + NODE_W; y2 = ty; }
      const mx = (x1 + x2) / 2;
      cp1x = mx; cp1y = y1; cp2x = mx; cp2y = y2;
    } else {
      if (ty > fy) { x1 = fx; y1 = from.y + NODE_H; x2 = tx; y2 = to.y; }
      else          { x1 = fx; y1 = from.y;           x2 = tx; y2 = to.y + NODE_H; }
      const my = (y1 + y2) / 2;
      cp1x = x1; cp1y = my; cp2x = x2; cp2y = my;
    }
    return {
      path: `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2,
    };
  }

  const isLinking = linkPhase.phase !== "idle";
  const sourceNodeId = linkPhase.phase === "target" ? linkPhase.sourceId : null;

  return (
    <div
      className="tree-wrapper"
      ref={wrapperRef}
      onPointerDown={handleWrapperPointerDown}
      onPointerMove={handleWrapperPointerMove}
      onPointerUp={handleWrapperPointerUp}
      style={{ cursor: toolMode === "pan" ? "grab" : "default" }}
      onClick={() => {
        if (isLinking && !panMovedRef.current) setLinkPhase({ phase: "idle" });
        setEditingNodeId(null);
      }}
    >
      {/* Dot grid — shifts and scales with pan/zoom without being inside the canvas transform */}
      <div
        className="tree-grid"
        style={{
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas: all nodes and lines live here, transformed together */}
      <div
        className="tree-canvas"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
      >
        {/* SVG at canvas origin with overflow:visible — draws all bezier links */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, overflow: "visible" }}>
          {links.map(link => {
            const geo = getLinkGeometry(link);
            if (!geo) return null;
            return (
              <g key={link.id} className="tree-link-group">
                {/* Wide invisible path gives a generous hover target along the curve */}
                <path d={geo.path} fill="none" stroke="rgba(0,0,0,0)" strokeWidth={14 / zoom} style={{ pointerEvents: "stroke" }} />
                <path d={geo.path} fill="none" stroke="var(--text-dim)" strokeWidth={1.5 / zoom} style={{ pointerEvents: "none" }} />
                <g
                  className="tree-link-delete"
                  transform={`translate(${geo.midX}, ${geo.midY})`}
                  onClick={e => { e.stopPropagation(); setLinks(prev => prev.filter(l => l.id !== link.id)); }}
                  style={{ cursor: "pointer" }}
                >
                  <circle r={8 / zoom} fill="var(--bg-elevated)" stroke="var(--border)" strokeWidth={1 / zoom} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={9 / zoom} fill="var(--text-muted)" style={{ pointerEvents: "none", userSelect: "none" }}>✕</text>
                </g>
              </g>
            );
          })}
        </svg>

        {nodes.map(node => (
          <div
            key={node.id}
            className={[
              "tree-node",
              sourceNodeId === node.id ? "tree-node-source" : "",
              isLinking && sourceNodeId !== node.id ? "tree-node-linkable" : "",
            ].filter(Boolean).join(" ")}
            style={{ left: node.x, top: node.y }}
            onPointerDown={e => handleNodePointerDown(e, node)}
            onClick={e => handleNodeClick(e, node.id)}
            onDoubleClick={e => {
              if (isLinking) return;
              e.stopPropagation();
              setEditingNodeId(node.id);
            }}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <input
              className="tree-node-input"
              value={node.description}
              placeholder="task"
              readOnly={editingNodeId !== node.id}
              style={{ pointerEvents: editingNodeId === node.id ? "auto" : "none" }}
              onChange={e => {
                const val = e.target.value;
                setNodes(prev => prev.map(n => n.id === node.id ? { ...n, description: val } : n));
              }}
              onPointerDown={e => e.stopPropagation()}
              onBlur={() => setEditingNodeId(null)}
              onKeyDown={e => {
                if (e.key === "Escape" || e.key === "Enter") {
                  e.preventDefault();
                  setEditingNodeId(null);
                }
              }}
              ref={el => { if (el) inputRefs.current.set(node.id, el); else inputRefs.current.delete(node.id); }}
            />
            {hoveredNode === node.id && !isLinking && (
              <button
                className="tree-node-delete"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); deleteNode(node.id); }}
              >✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Fixed overlay toolbar — always visible regardless of pan/zoom */}
      <div className="tree-overlay" onClick={e => e.stopPropagation()}>
        <button className="tree-ctrl-btn" onClick={addNode}>+ task</button>
        <div className="tree-ctrl-divider" />
        <button
          className={`tree-ctrl-btn${isLinking ? " tree-ctrl-active" : ""}`}
          onClick={() => setLinkPhase(p => p.phase === "idle" ? { phase: "source" } : { phase: "idle" })}
        >
          ⟶ link
        </button>
        <div className="tree-ctrl-divider" />
        <button className="tree-ctrl-btn tree-ctrl-icon" onClick={() => changeZoom(-0.15)}>−</button>
        <span className="tree-ctrl-zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="tree-ctrl-btn tree-ctrl-icon" onClick={() => changeZoom(0.15)}>+</button>
        <div className="tree-ctrl-divider" />
        <button
          className={`tree-ctrl-btn${toolMode === "select" ? " tree-ctrl-active" : ""}`}
          onClick={() => setToolMode("select")}
        >
          ◻ select
        </button>
        <button
          className={`tree-ctrl-btn${toolMode === "pan" ? " tree-ctrl-active" : ""}`}
          onClick={() => setToolMode("pan")}
        >
          ✥ pan
        </button>
        <button
          className="tree-ctrl-btn"
          onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
        >
          ⌖ reset
        </button>
      </div>

      {isLinking && (
        <div className="tree-link-hint">
          {linkPhase.phase === "source"
            ? "click a task to start the link — click canvas to cancel"
            : "click another task to connect — click canvas to cancel"}
        </div>
      )}
    </div>
  );
}
