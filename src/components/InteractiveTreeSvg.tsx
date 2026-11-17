import React, { useMemo, useRef, useState } from 'react';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { TreeNode } from '../types/credit';
import { formatFeatureValue, formatPct } from '../utils/format';

interface InteractiveTreeSvgProps {
  root: TreeNode;
  selectedNodeId?: string | null;
  onSelectNode?: (node: TreeNode) => void;
  highlightedNodeIds?: Set<string>;
  highlightedEdgePairs?: Set<string>;
  alertThreshold?: number;
  title?: string;
}

interface PositionedNode {
  node: TreeNode;
  x: number;
  y: number;
}

interface PositionedEdge {
  from: PositionedNode;
  to: PositionedNode;
  branch: 'left' | 'right';
  label: string;
  isHighlighted: boolean;
}

const NODE_W = 204;
const NODE_H = 92;
const H_GAP = 26;
const V_GAP = 132;

function layoutBinaryTree(root: TreeNode): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  width: number;
  height: number;
} {
  let leafIndex = 0;
  const coords = new Map<string, { x: number; y: number }>();

  function assignPositions(node: TreeNode): number {
    const y = 68 + node.depth * V_GAP;
    if (node.isLeaf || !node.left || !node.right) {
      const x = 126 + leafIndex * (NODE_W + H_GAP);
      leafIndex += 1;
      coords.set(node.id, { x, y });
      return x;
    }
    const leftX = assignPositions(node.left);
    const rightX = assignPositions(node.right);
    const x = (leftX + rightX) / 2;
    coords.set(node.id, { x, y });
    return x;
  }

  assignPositions(root);

  const nodes: PositionedNode[] = [];
  const edges: PositionedEdge[] = [];
  let maxX = 0;
  let maxY = 0;

  function collect(node: TreeNode) {
    const pos = coords.get(node.id) ?? { x: 200, y: 80 };
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
    const currentPos: PositionedNode = { node, x: pos.x, y: pos.y };
    nodes.push(currentPos);

    if (!node.isLeaf && node.left && node.right) {
      const leftPos = coords.get(node.left.id)!;
      const rightPos = coords.get(node.right.id)!;
      edges.push({
        from: currentPos,
        to: { node: node.left, x: leftPos.x, y: leftPos.y },
        branch: 'left',
        label: 'Sí (<=)',
        isHighlighted: false,
      });
      edges.push({
        from: currentPos,
        to: { node: node.right, x: rightPos.x, y: rightPos.y },
        branch: 'right',
        label: 'No (>)',
        isHighlighted: false,
      });
      collect(node.left);
      collect(node.right);
    }
  }

  collect(root);

  return {
    nodes,
    edges,
    width: Math.max(540, maxX + NODE_W / 2 + 80),
    height: Math.max(270, maxY + NODE_H / 2 + 72),
  };
}

export function InteractiveTreeSvg({
  root,
  selectedNodeId,
  onSelectNode,
  highlightedNodeIds,
  highlightedEdgePairs,
  alertThreshold = 0.3,
  title = 'Árbol de decisión interactivo',
}: InteractiveTreeSvgProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const layout = useMemo(() => layoutBinaryTree(root), [root]);

  const handleZoomIn = () => setZoom((z) => Math.min(1.85, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.45, +(z - 0.15).toFixed(2)));
  const handleCenter = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleFit = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || layout.width <= 0) {
      handleCenter();
      return;
    }
    const fitScale = Math.min(1, Math.max(0.45, (rect.width - 24) / layout.width));
    setZoom(+fitScale.toFixed(2));
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).closest('[data-tree-node="true"]')) return;
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const onPointerUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div className="lab-panel rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#25E5F2]/15 bg-[#0D162C]/90">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]">
          <span className="font-semibold text-[#F0F7FF]">{title}</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#25E5F2]">Umbral alerta: {formatPct(alertThreshold)}</span>
          <span aria-hidden="true">·</span>
          <span>Arrastra para mover o usa zoom</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
            aria-label="Alejar árbol"
          >
            <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>-</span>
          </button>
          <span className="font-mono-num text-xs text-[#CBD5E1] min-w-[44px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
            aria-label="Acercar árbol"
          >
            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            <span>+</span>
          </button>
          <button
            type="button"
            onClick={handleFit}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ajustar</span>
          </button>
          <button
            type="button"
            onClick={handleCenter}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Centrar</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-[460px] overflow-auto bg-[#070E20]"
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="region"
          aria-label={title}
          className={`select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <defs>
            <pattern id="treeLabGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="#25E5F2"
                strokeOpacity="0.06"
                strokeWidth="1"
              />
              <circle cx="0" cy="0" r="1" fill="#9C6BFF" fillOpacity="0.16" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#treeLabGrid)" />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Aristas */}
            {layout.edges.map((edge) => {
              const pairKey = `${edge.from.node.id}->${edge.to.node.id}`;
              const isHighlighted = highlightedEdgePairs?.has(pairKey) ?? false;
              const startX = edge.from.x;
              const startY = edge.from.y + NODE_H / 2;
              const endX = edge.to.x;
              const endY = edge.to.y - NODE_H / 2;
              const midY = (startY + endY) / 2;
              const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
              const labelX = (startX + endX) / 2 + (edge.branch === 'left' ? -24 : 24);
              const labelY = midY - 4;

              return (
                <g key={pairKey}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? '#25E5F2' : 'rgba(37, 229, 242, 0.28)'}
                    strokeWidth={isHighlighted ? 3 : 1.5}
                    strokeDasharray={isHighlighted ? undefined : edge.branch === 'right' ? '4 3' : undefined}
                  />
                  <rect
                    x={labelX - 28}
                    y={labelY - 11}
                    width={56}
                    height={18}
                    rx={4}
                    fill={isHighlighted ? '#0D2E3F' : '#0D1730'}
                    stroke={isHighlighted ? '#25E5F2' : 'rgba(148, 163, 184, 0.35)'}
                    strokeWidth={1}
                  />
                  <text
                    x={labelX}
                    y={labelY + 1}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={isHighlighted ? 700 : 500}
                    fill={isHighlighted ? '#25E5F2' : '#CBD5E1'}
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Nodos */}
            {layout.nodes.map(({ node, x, y }) => {
              const isSelected = selectedNodeId === node.id;
              const isOnPath = highlightedNodeIds?.has(node.id) ?? false;
              const isAlertLeaf = node.isLeaf && node.pIncumplimiento >= alertThreshold;

              const fillColor = node.isLeaf
                ? isAlertLeaf
                  ? '#261914'
                  : '#0C2530'
                : '#101B36';

              const strokeColor = isSelected
                ? '#F0F7FF'
                : isOnPath
                  ? '#25E5F2'
                  : node.isLeaf
                    ? isAlertLeaf
                      ? '#F59E0B'
                      : '#14B8A6'
                    : 'rgba(156, 107, 255, 0.55)';

              const strokeWidth = isSelected ? 2.6 : isOnPath ? 2.4 : 1.4;

              const splitText =
                !node.isLeaf && node.feature && typeof node.threshold === 'number'
                  ? `${node.featureLabel} <= ${formatFeatureValue(node.feature, node.threshold)}`
                  : node.isLeaf
                    ? isAlertLeaf
                      ? 'Hoja · Alerta riesgo'
                      : 'Hoja · Sin alerta'
                    : 'Hoja';

              const ariaText = `Nodo ${node.id}, profundidad ${node.depth}, ${
                node.isLeaf ? 'hoja terminal' : `división ${splitText}`
              }, n=${node.n}, incumplidores=${node.positivos}, proporción=${formatPct(
                node.pIncumplimiento,
              )}`;

              return (
                <g
                  key={node.id}
                  data-tree-node="true"
                  transform={`translate(${x - NODE_W / 2}, ${y - NODE_H / 2})`}
                  tabIndex={0}
                  role="button"
                  aria-label={ariaText}
                  aria-pressed={isSelected}
                  onClick={() => onSelectNode?.(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectNode?.(node);
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {isSelected && (
                    <rect
                      x={-4}
                      y={-4}
                      width={NODE_W + 8}
                      height={NODE_H + 8}
                      rx={13}
                      fill="none"
                      stroke="#25E5F2"
                      strokeWidth={2}
                    />
                  )}
                  <rect
                    x={0}
                    y={0}
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                  {/* Encabezado nodo */}
                  <text
                    x={10}
                    y={19}
                    fontSize={10}
                    fontWeight={600}
                    fill="#94A3B8"
                  >
                    {`${node.id} · Prof. ${node.depth}`}
                  </text>
                  <text
                    x={NODE_W - 10}
                    y={19}
                    textAnchor="end"
                    fontSize={10}
                    fontWeight={700}
                    fill={
                      node.isLeaf
                        ? isAlertLeaf
                          ? '#FBBF24'
                          : '#25E5F2'
                        : '#C4B5FD'
                    }
                  >
                    {node.isLeaf ? (isAlertLeaf ? 'ALERTA' : 'SIN ALERTA') : 'DIVISIÓN'}
                  </text>

                  {/* Pregunta o clase */}
                  <text
                    x={10}
                    y={40}
                    fontSize={11.5}
                    fontWeight={700}
                    fill="#F0F7FF"
                  >
                    {splitText.length > 29 ? `${splitText.slice(0, 28)}…` : splitText}
                  </text>

                  {/* Conteo y proporción */}
                  <text
                    x={10}
                    y={60}
                    fontSize={11}
                    fontFamily="IBM Plex Mono, monospace"
                    fill="#CBD5E1"
                  >
                    {`n=${node.n} · inc=${node.positivos} (${formatPct(node.pIncumplimiento)})`}
                  </text>

                  {/* Barra de proporción visual */}
                  <rect
                    x={10}
                    y={72}
                    width={NODE_W - 20}
                    height={7}
                    rx={3.5}
                    fill="#1E293B"
                  />
                  <rect
                    x={10}
                    y={72}
                    width={Math.max(0, (NODE_W - 20) * Math.min(1, node.pIncumplimiento))}
                    height={7}
                    rx={3.5}
                    fill={node.pIncumplimiento >= alertThreshold ? '#F59E0B' : '#25E5F2'}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Leyenda accesible */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-t border-[#25E5F2]/15 bg-[#0D162C]/90 text-xs text-[#CBD5E1]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded border border-[#9C6BFF] bg-[#101B36]" aria-hidden="true" />
          <span>Nodo interno (DIVISIÓN: &lt;= izq / &gt; der)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded border border-[#14B8A6] bg-[#0C2530]" aria-hidden="true" />
          <span>Hoja SIN ALERTA (p &lt; umbral)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded border border-[#F59E0B] bg-[#261914]" aria-hidden="true" />
          <span>Hoja ALERTA (p &gt;= umbral)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 bg-[#25E5F2]" aria-hidden="true" />
          <span>Ruta elegida</span>
        </div>
      </div>
    </div>
  );
}
