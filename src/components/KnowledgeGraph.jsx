import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, HelpCircle } from 'lucide-react';

export default function KnowledgeGraph({ onNodeSelect, highlightPath = [] }) {
  const canvasRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  // View state: panning and zooming
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Physics simulation state stored in refs for the animation loop
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const draggingNodeRef = useRef(null);
  const hoveredNodeRef = useRef(null);

  const colors = {
    concept: '#8b5cf6', // Violet
    playbook: '#10b981', // Emerald
    schema: '#f59e0b', // Amber
    index: '#6366f1', // Indigo
    unknown: '#94a3b8'  // Muted
  };

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graph');
      const data = await res.json();
      
      // Initialize physics properties
      const canvas = canvasRef.current;
      const width = canvas ? canvas.width : 800;
      const height = canvas ? canvas.height : 500;
      
      // Keep existing positions if re-fetching
      const oldNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));

      const initializedNodes = data.nodes.map((node, i) => {
        const oldNode = oldNodesMap.get(node.id);
        if (oldNode) {
          return { ...node, ...oldNode };
        }
        // Arrange in a circle initially
        const angle = (i / data.nodes.length) * Math.PI * 2;
        const radius = 150;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: node.type === 'index' ? 36 : 28
        };
      });

      nodesRef.current = initializedNodes;
      edgesRef.current = data.edges;
      setGraphData(data);
      
      // Reset panning to center
      if (canvas) {
        setPan({ x: 0, y: 0 });
        setZoom(1);
      }
    } catch (e) {
      console.error("Failed to load graph data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  // Force-directed layout physics + canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const runPhysicsAndDraw = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // ── Physics Simulation (Force-directed layout) ──
      // 1. Repulsion force between all node pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = n1.radius + n2.radius + 60;
          
          if (dist < minDist) {
            const force = (minDist - dist) * 0.08;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (n1 !== draggingNodeRef.current) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (n2 !== draggingNodeRef.current) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // 2. Attraction force along edges
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredLen = 140;
          
          // spring constant
          const force = (dist - desiredLen) * 0.03;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          if (source !== draggingNodeRef.current) {
            source.vx += fx;
            source.vy += fy;
          }
          if (target !== draggingNodeRef.current) {
            target.vx -= fx;
            target.vy -= fy;
          }
        }
      });

      // 3. Central gravity force
      const cx = width / 2;
      const cy = height / 2;
      nodes.forEach(node => {
        if (node === draggingNodeRef.current) return;
        const dx = cx - node.x;
        const dy = cy - node.y;
        node.vx += dx * 0.005;
        node.vy += dy * 0.005;
      });

      // 4. Update positions with friction damping
      nodes.forEach(node => {
        if (node === draggingNodeRef.current) return;
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.75;
        node.vy *= 0.75;

        // Keep within boundaries
        node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
      });

      // ── Canvas Rendering ──
      ctx.clearRect(0, 0, width, height);

      // Grid background effect
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const startX = pan.x % (gridSize * zoom);
      const startY = pan.y % (gridSize * zoom);
      for (let x = startX; x < width; x += gridSize * zoom) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = startY; y < height; y += gridSize * zoom) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Apply zoom & pan translation
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw Edges (Lines)
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.from);
        const target = nodes.find(n => n.id === edge.to);
        
        if (source && target) {
          const isHighlighted = highlightPath.includes(edge.from) && 
                                highlightPath.includes(edge.to) &&
                                highlightPath.indexOf(edge.to) === highlightPath.indexOf(edge.from) + 1;

          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          
          if (edge.broken) {
            ctx.strokeStyle = '#f43f5e';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1.5;
          } else if (isHighlighted) {
            ctx.strokeStyle = '#a78bfa';
            ctx.setLineDash([]);
            ctx.lineWidth = 3.5;
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.setLineDash([]);
            ctx.lineWidth = 1.5;
          }
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash

          // Draw directed arrow
          const angle = Math.atan2(target.y - source.y, target.x - source.x);
          const arrowLength = 10;
          // Offset arrow to target node circumference
          const arrowX = target.x - Math.cos(angle) * (target.radius + 3);
          const arrowY = target.y - Math.sin(angle) * (target.radius + 3);

          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - arrowLength * Math.cos(angle - Math.PI / 6), arrowY - arrowLength * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(arrowX - arrowLength * Math.cos(angle + Math.PI / 6), arrowY - arrowLength * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fillStyle = edge.broken ? '#f43f5e' : (isHighlighted ? '#a78bfa' : 'rgba(255, 255, 255, 0.2)');
          ctx.fill();
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        const isHighlighted = highlightPath.includes(node.id);
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const nodeColor = colors[node.type] || colors.unknown;

        // Glowing outer shadow for highlighted/selected nodes
        if (isHighlighted || isSelected || isHovered) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + (isHovered ? 4 : 2), 0, Math.PI * 2);
          ctx.shadowColor = isHighlighted ? '#a78bfa' : nodeColor;
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fill();
          ctx.restore();
        }

        // Inner Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        
        ctx.strokeStyle = isHighlighted ? '#a78bfa' : nodeColor;
        ctx.lineWidth = isSelected ? 3.5 : (isHighlighted ? 2.5 : 2);
        ctx.stroke();

        // Title text inside node
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${node.type === 'index' ? 12 : 11}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Wrap labels inside node if too long
        const text = node.label || node.id;
        const words = text.split(/\s+/);
        if (words.length > 1 && text.length > 8) {
          // Draw split lines
          ctx.fillText(words.slice(0, Math.ceil(words.length/2)).join(' '), node.x, node.y - 6);
          ctx.fillText(words.slice(Math.ceil(words.length/2)).join(' '), node.x, node.y + 6);
        } else {
          ctx.fillText(text, node.x, node.y);
        }

        // Mini badge for Type on top-right of node
        ctx.beginPath();
        ctx.arc(node.x + node.radius * 0.7, node.y - node.radius * 0.7, 6, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(runPhysicsAndDraw);
    };

    runPhysicsAndDraw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [pan, zoom, selectedNode, highlightPath]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 480;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Screen-to-World coordinates mapper helper
  const getMouseCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Map client coords to world coords by reversing zoom and pan
    const worldX = (clientX - pan.x) / zoom;
    const worldY = (clientY - pan.y) / zoom;
    return { worldX, worldY, clientX, clientY };
  };

  // Mouse Listeners
  const handleMouseDown = (e) => {
    const { worldX, worldY, clientX, clientY } = getMouseCoords(e);
    
    // Check if clicked a node
    const clickedNode = nodesRef.current.find(node => {
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });

    if (clickedNode) {
      draggingNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
    } else {
      isDraggingCanvas.current = true;
      dragStart.current = { x: clientX - pan.x, y: clientY - pan.y };
    }
  };

  const handleMouseMove = (e) => {
    const { worldX, worldY, clientX, clientY } = getMouseCoords(e);

    // 1. Handle dragging node
    if (draggingNodeRef.current) {
      draggingNodeRef.current.x = worldX;
      draggingNodeRef.current.y = worldY;
      draggingNodeRef.current.vx = 0;
      draggingNodeRef.current.vy = 0;
      return;
    }

    // 2. Handle dragging background pan
    if (isDraggingCanvas.current) {
      setPan({
        x: clientX - dragStart.current.x,
        y: clientY - dragStart.current.y
      });
      return;
    }

    // 3. Handle hovering nodes
    const hoveredNode = nodesRef.current.find(node => {
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    hoveredNodeRef.current = hoveredNode || null;
    canvasRef.current.style.cursor = hoveredNode ? 'pointer' : (isDraggingCanvas.current ? 'grabbing' : 'grab');
  };

  const handleMouseUp = () => {
    draggingNodeRef.current = null;
    isDraggingCanvas.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    newZoom = Math.max(0.3, Math.min(3, newZoom));
    setZoom(newZoom);
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    fetchGraph();
  };

  return (
    <div className="glass-panel p-6 space-y-4 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Interactive Knowledge Graph</h2>
          <p className="text-xs text-[#94a3b8]">Drag nodes to arrange them. Scroll to zoom. Double-click or click edit below to open files.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setZoom(prev => Math.min(3, prev + 0.1))} className="btn btn-secondary !p-2" title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))} className="btn btn-secondary !p-2" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button onClick={resetView} className="btn btn-secondary !p-2" title="Reset Layout & Recenter">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas Graphic */}
        <div className="lg:col-span-3 border border-white/5 rounded-xl bg-black/30 overflow-hidden relative" style={{ height: '480px' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full block"
          />
          {loading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-[#8b5cf6]" />
              <span className="text-xs text-[#94a3b8]">Fetching graph structure...</span>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] h-full flex flex-col justify-between" style={{ minHeight: '300px' }}>
            <div>
              <h3 className="text-xs font-bold text-[#a78bfa] uppercase tracking-wider mb-3">Selected Document</h3>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-100">{selectedNode.label}</h4>
                    <span className={`badge ${
                      selectedNode.type === 'concept' ? 'badge-violet' :
                      selectedNode.type === 'playbook' ? 'badge-teal' :
                      selectedNode.type === 'schema' ? 'badge-amber' :
                      selectedNode.type === 'index' ? 'badge-indigo' :
                      'badge-rose'
                    } text-[10px] mt-1 capitalize`}>
                      {selectedNode.type}
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    {selectedNode.description || 'No description provided in frontmatter.'}
                  </p>
                  <div className="text-[10px] text-[#64748b] font-mono select-all">
                    Path: {selectedNode.id}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-[#64748b] space-y-2">
                  <HelpCircle size={32} className="mx-auto opacity-50" />
                  <p className="text-xs">Click a node in the graph to view details and metadata.</p>
                </div>
              )}
            </div>

            {selectedNode && (
              <button
                onClick={() => onNodeSelect(selectedNode.id)}
                className="btn btn-primary w-full mt-4 !py-2.5 !text-xs"
              >
                Open in Editor
              </button>
            )}
          </div>

          {/* Graph Legend */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-2 text-xs">
            <h4 className="font-semibold text-slate-300">Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> Index File
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Concepts
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Playbooks
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Schemas
              </div>
            </div>
            <div className="border-t border-white/5 pt-2 mt-2 text-[9px] text-[#64748b]">
              Dashed red lines indicate links pointing to missing or deleted documents (broken references).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
