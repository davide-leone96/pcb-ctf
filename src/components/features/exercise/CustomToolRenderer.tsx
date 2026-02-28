// src/components/features/exercise/CustomToolRenderer.tsx
'use client';

import { useRef, useCallback } from 'react';
import { getPinValues, type Exercise } from '@/data/exercise';
import type { CustomTool } from '@/types/custom-tool';
import { cn } from '@/lib/utils';

interface CustomToolRendererProps {
  tool: CustomTool;
  position: { x: number; y: number };
  connections: Array<{ probeId: string; pinId: string | null }>;
  snapTarget: { probeId: string; pinId: string } | null;
  activeProbeId: string | null;
  onDrag: (x: number, y: number) => void;
  onProbeClick: (probeId: string) => void;
  containerDims: { width: number; height: number };
  exerciseData: Exercise;
}

/** Converte coordinate normalizzate (%) in pixel assoluti nel container */
function normToPixel(
  coords: [number, number, number, number],
  dims: { width: number; height: number },
): { cx: number; cy: number } {
  const cx = (coords[0] / 100) * dims.width + ((coords[2] / 100) * dims.width) / 2;
  const cy = (coords[1] / 100) * dims.height + ((coords[3] / 100) * dims.height) / 2;
  return { cx, cy };
}

/** Calcola la lettura per una sonda connessa (output numerico) */
function getProbeReading(pinId: string | null, unit: string): string {
  if (!pinId) return '—';
  const val = getPinValues(pinId);
  if (!val) return 'ERR';
  // Se l'unità suggerisce resistenza usa valueOhm, altrimenti tensione
  const isOhm = unit.toLowerCase().includes('ω') || unit.toLowerCase().includes('ohm') || unit === 'Ω';
  const num = isOhm ? val.valueOhm : val.valueV;
  return `${num.toFixed(2)} ${unit}`;
}

const TOOL_BODY_WIDTH = 180;
const PROBE_SIZE = 14;
const PROBE_SPACING = 32;

const CustomToolRenderer = ({
  tool, position, connections, snapTarget, activeProbeId,
  onDrag, onProbeClick, containerDims, exerciseData,
}: CustomToolRendererProps) => {
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  // Body height: taller when there are more probes
  const bodyHeight = Math.max(80, tool.probes.length * PROBE_SPACING + 20);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.probe) return; // don't start drag on probe
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y };

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      onDrag(
        dragRef.current.startPosX + me.clientX - dragRef.current.startX,
        dragRef.current.startPosY + me.clientY - dragRef.current.startY,
      );
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [position, onDrag]);

  // Build a map of connected pin positions for wire rendering
  const allPins = [
    ...(exerciseData.pins ?? []).map(p => ({ id: p.id, coords: p.coords })),
    ...(exerciseData.uartPins ?? []).map(p => ({ id: p.id, coords: p.coords })),
  ];
  const pinPosMap: Record<string, { cx: number; cy: number }> = {};
  allPins.forEach(p => {
    pinPosMap[p.id] = normToPixel(p.coords, containerDims);
  });

  // Probe Y positions (relative to tool body top)
  const probeYOffsets = tool.probes.map((_, i) => 20 + i * PROBE_SPACING);

  return (
    <>
      {/* SVG wire layer — rendered behind tool body */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: containerDims.width, height: containerDims.height, zIndex: 20 }}
      >
        {connections.map((conn, i) => {
          if (!conn.pinId) return null;
          const probe = tool.probes.find(p => p.id === conn.probeId);
          if (!probe) return null;
          const pinPos = pinPosMap[conn.pinId];
          if (!pinPos) return null;
          const probeX = position.x - PROBE_SIZE / 2; // probes are left of the body
          const probeY = position.y + (probeYOffsets[i] ?? 0) + PROBE_SIZE / 2;
          return (
            <line
              key={conn.probeId}
              x1={probeX}
              y1={probeY}
              x2={pinPos.cx}
              y2={pinPos.cy}
              stroke={probe.color}
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={0.85}
            />
          );
        })}
      </svg>

      {/* Tool body */}
      <div
        className="absolute select-none cursor-move"
        style={{ left: position.x, top: position.y, zIndex: 30 }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="relative rounded-lg border border-gray-500 bg-gray-800 shadow-xl overflow-hidden"
          style={{ width: TOOL_BODY_WIDTH, minHeight: bodyHeight }}
        >
          {/* Header with tool name */}
          <div className="px-2 py-1 bg-gray-700/80 border-b border-gray-600 flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-300 truncate">{tool.name}</span>
            {tool.outputType === 'numeric' && (
              <NumericDisplay connections={connections} tool={tool} />
            )}
          </div>

          {/* Tool image or placeholder */}
          <div className="flex items-center justify-center" style={{ minHeight: bodyHeight - 28 }}>
            {tool.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tool.imagePath}
                alt={tool.name}
                className="max-w-full max-h-full object-contain pointer-events-none"
                style={{ maxHeight: Math.max(60, bodyHeight - 40) }}
                draggable={false}
              />
            ) : (
              <span className="text-[10px] text-gray-600 italic">nessuna grafica</span>
            )}
          </div>
        </div>

        {/* Probe handles — positioned to the left of the body */}
        {tool.probes.map((probe, i) => {
          const yOffset = probeYOffsets[i];
          const conn = connections.find(c => c.probeId === probe.id);
          const isActive = activeProbeId === probe.id;
          const isSnapping = snapTarget?.probeId === probe.id;
          const isConnected = !!conn?.pinId;

          return (
            <div
              key={probe.id}
              data-probe="1"
              className={cn(
                'absolute flex items-center cursor-pointer transition-all',
                isActive && 'scale-125',
              )}
              style={{ top: yOffset, left: -(PROBE_SIZE + 4) }}
              onClick={e => { e.stopPropagation(); onProbeClick(probe.id); }}
              title={`${probe.label || probe.role} — ${isConnected ? `connessa a ${conn?.pinId}` : 'non connessa'}`}
            >
              <div
                className={cn(
                  'rounded-full flex items-center justify-center text-[8px] font-bold transition-all',
                  isSnapping && 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-125',
                  isActive && 'ring-2 ring-offset-1 ring-offset-transparent',
                )}
                style={{
                  width: PROBE_SIZE,
                  height: PROBE_SIZE,
                  backgroundColor: probe.color,
                  ringColor: probe.color,
                  boxShadow: isConnected ? `0 0 6px ${probe.color}` : undefined,
                }}
              >
                {probe.label?.[0] ?? '•'}
              </div>
              {/* Probe label */}
              <span
                className="ml-1 text-[9px] font-mono pointer-events-none"
                style={{ color: probe.color }}
              >
                {probe.label || probe.role}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ============================================
// NUMERIC DISPLAY (shown in header)
// ============================================

const NumericDisplay = ({
  connections, tool,
}: {
  connections: Array<{ probeId: string; pinId: string | null }>;
  tool: CustomTool;
}) => {
  // Show reading for the first connected probe
  const firstConn = connections.find(c => c.pinId);
  const unit = tool.outputUnit ?? (tool.modes?.[0]?.unit ?? '');
  const reading = firstConn ? getProbeReading(firstConn.pinId, unit) : '—';

  return (
    <span className="text-[10px] font-mono text-green-400 tabular-nums">
      {reading}
    </span>
  );
};

export default CustomToolRenderer;
