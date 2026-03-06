// src/components/features/exercise/CustomToolRenderer.tsx
'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
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
  onDumpComplete?: (toolId: string) => void;
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
  onDrag, onProbeClick, containerDims, exerciseData, onDumpComplete,
}: CustomToolRendererProps) => {
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const [noise, setNoise] = useState(0);
  const [dumpModalOpen, setDumpModalOpen] = useState(false);

  // Fluttuazione realistica dell'ultimo digit (come il multimetro)
  useEffect(() => {
    if (tool.outputType !== 'numeric') return;
    const interval = setInterval(() => {
      setNoise((Math.random() - 0.5) * 0.04);
    }, 400);
    return () => clearInterval(interval);
  }, [tool.outputType]);

  // Auto-trigger dump modal when all required connections are satisfied
  const cfg = tool.firmwareDumpConfig;
  const allRequiredConnected = cfg
    ? cfg.requiredConnections.length > 0 &&
      cfg.requiredConnections.every(req =>
        connections.some(c => c.probeId === req.probeId && c.pinId === req.pinId)
      )
    : false;

  useEffect(() => {
    if (allRequiredConnected && !dumpModalOpen) {
      setDumpModalOpen(true);
    }
  // Only trigger on the transition from false → true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequiredConnected]);

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
          className="relative rounded-lg border border-gray-600 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl overflow-hidden ring-1 ring-white/10"
          style={{ width: TOOL_BODY_WIDTH, minHeight: bodyHeight }}
        >
          {/* Header with tool name */}
          <div className="px-2 py-1 bg-gray-700/80 border-b border-gray-600">
            <span className="text-[10px] font-mono text-gray-300 truncate">{tool.name}</span>
          </div>

          {/* Body content based on outputType */}
          <div className="px-2 py-2 flex flex-col gap-2" style={{ minHeight: bodyHeight - 28 }}>
            {tool.outputType === 'numeric' && (
              <NumericDisplay connections={connections} tool={tool} noise={noise} />
            )}
            {tool.outputType === 'connection-status' && (
              <ConnectionStatusDisplay connections={connections} tool={tool} />
            )}
            {tool.outputType === 'leds' && (
              <LedsDisplay connections={connections} tool={tool} />
            )}
            {tool.outputType === 'firmware-dump' && (
              <FirmwareDumpStatusDisplay
                connections={connections}
                tool={tool}
                allConnected={allRequiredConnected}
                onStartDump={() => setDumpModalOpen(true)}
              />
            )}
            {/* Decorative grill lines for visual body */}
            <div className="mt-auto flex flex-col gap-0.5 opacity-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-px bg-gray-400 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Firmware dump modal */}
        {tool.outputType === 'firmware-dump' && dumpModalOpen && cfg && (
          <FirmwareDumpModal
            tool={tool}
            onClose={() => setDumpModalOpen(false)}
            onComplete={() => {
              setDumpModalOpen(false);
              onDumpComplete?.(tool.id);
            }}
          />
        )}

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
// NUMERIC DISPLAY (LCD-style, come il multimetro)
// ============================================

const NumericDisplay = ({
  connections, tool, noise,
}: {
  connections: Array<{ probeId: string; pinId: string | null }>;
  tool: CustomTool;
  noise: number;
}) => {
  const firstConn = connections.find(c => c.pinId);
  const unit = tool.outputUnit ?? (tool.modes?.[0]?.unit ?? '');

  let display = '—';
  if (firstConn?.pinId) {
    const val = getPinValues(firstConn.pinId);
    if (val) {
      const isOhm = unit.toLowerCase().includes('ω') || unit.toLowerCase().includes('ohm') || unit === 'Ω';
      const num = (isOhm ? val.valueOhm : val.valueV) + noise;
      display = isOhm ? Math.max(0, num).toFixed(0) : num.toFixed(2);
    } else {
      display = 'ERR';
    }
  }

  return (
    <div className="bg-cyan-900/50 backdrop-blur-sm border border-cyan-700 text-right px-2 py-1.5 rounded-md shadow-inner">
      <span className="text-2xl font-mono text-cyan-300 tabular-nums">{display}</span>
      {unit && <span className="text-sm ml-1 text-cyan-300/80">{unit}</span>}
    </div>
  );
};

// ============================================
// CONNECTION STATUS DISPLAY
// ============================================

const ConnectionStatusDisplay = ({
  connections, tool,
}: {
  connections: Array<{ probeId: string; pinId: string | null }>;
  tool: CustomTool;
}) => (
  <div className="flex flex-col gap-1">
    {tool.probes.map(probe => {
      const conn = connections.find(c => c.probeId === probe.id);
      const connected = !!conn?.pinId;
      return (
        <div key={probe.id} className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all',
              connected ? 'shadow-[0_0_6px_currentColor]' : 'opacity-30',
            )}
            style={{ backgroundColor: probe.color, color: probe.color }}
          />
          <span className="text-[9px] font-mono text-gray-400 truncate">{probe.label || probe.role}</span>
          <span className={cn('text-[9px] font-mono ml-auto', connected ? 'text-green-400' : 'text-gray-600')}>
            {connected ? 'ON' : 'OFF'}
          </span>
        </div>
      );
    })}
  </div>
);

// ============================================
// LEDS DISPLAY
// ============================================

const LedsDisplay = ({
  connections, tool,
}: {
  connections: Array<{ probeId: string; pinId: string | null }>;
  tool: CustomTool;
}) => (
  <div className="flex flex-wrap gap-1.5 justify-center py-1">
    {tool.probes.map(probe => {
      const conn = connections.find(c => c.probeId === probe.id);
      const connected = !!conn?.pinId;
      let lit = false;
      if (connected && conn?.pinId) {
        const val = getPinValues(conn.pinId);
        lit = val ? val.valueV > 0.5 : false;
      }
      return (
        <div key={probe.id} className="flex flex-col items-center gap-0.5">
          <div
            className={cn('w-4 h-4 rounded-full border transition-all', lit ? 'border-transparent' : 'border-gray-600 opacity-30')}
            style={{
              backgroundColor: lit ? probe.color : 'transparent',
              boxShadow: lit ? `0 0 8px ${probe.color}` : undefined,
            }}
          />
          <span className="text-[8px] font-mono text-gray-500">{probe.label?.[0] ?? '•'}</span>
        </div>
      );
    })}
  </div>
);

// ============================================
// FIRMWARE DUMP STATUS DISPLAY
// ============================================

const FirmwareDumpStatusDisplay = ({
  connections, tool, allConnected, onStartDump,
}: {
  connections: Array<{ probeId: string; pinId: string | null }>;
  tool: CustomTool;
  allConnected: boolean;
  onStartDump: () => void;
}) => {
  const cfg = tool.firmwareDumpConfig;
  if (!cfg) return null;
  const connectedCount = cfg.requiredConnections.filter(req =>
    connections.some(c => c.probeId === req.probeId && c.pinId === req.pinId)
  ).length;
  const total = cfg.requiredConnections.length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-orange-400 uppercase">SPI Flash</span>
        <span className={cn('text-[9px] font-mono', allConnected ? 'text-green-400' : 'text-gray-500')}>
          {connectedCount}/{total}
        </span>
      </div>
      {allConnected ? (
        <button
          onClick={e => { e.stopPropagation(); onStartDump(); }}
          className="w-full py-1 rounded text-[9px] font-mono font-bold bg-orange-600/80 hover:bg-orange-500/80 text-white transition-colors animate-pulse"
          data-probe="1"
        >
          DUMP
        </button>
      ) : (
        <div className="flex flex-col gap-0.5">
          {cfg.requiredConnections.map(req => {
            const conn = connections.find(c => c.probeId === req.probeId && c.pinId === req.pinId);
            const probe = tool.probes.find(p => p.id === req.probeId);
            return (
              <div key={req.probeId} className="flex items-center gap-1">
                <div
                  className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', conn ? 'opacity-100' : 'opacity-30')}
                  style={{ backgroundColor: probe?.color ?? '#6B7280' }}
                />
                <span className="text-[8px] font-mono text-gray-500 truncate">{probe?.label || req.probeId}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// FIRMWARE DUMP MODAL
// ============================================

const FirmwareDumpModal = ({
  tool, onClose, onComplete,
}: {
  tool: CustomTool;
  onClose: () => void;
  onComplete: () => void;
}) => {
  const cfg = tool.firmwareDumpConfig!;
  const durationMs = (cfg.dumpDurationSec ?? 3) * 1000;
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stepMs = 30;
    const increment = 100 / (durationMs / stepMs);
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(interval);
          setDone(true);
          return 100;
        }
        return next;
      });
    }, stepMs);
    return () => clearInterval(interval);
  }, [durationMs]);

  const handleDownload = () => {
    if (cfg.filePath) {
      const a = document.createElement('a');
      a.href = cfg.filePath;
      a.download = cfg.fileName || 'firmware.bin';
      a.click();
    }
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
      onClick={e => { if (done) { e.stopPropagation(); onClose(); } }}
    >
      <div
        className="bg-gradient-to-br from-gray-800 to-gray-900 border border-orange-500/50 rounded-lg p-6 w-80 shadow-2xl ring-1 ring-orange-500/20"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn('w-2 h-2 rounded-full', done ? 'bg-green-400' : 'bg-orange-400 animate-pulse')} />
          <span className="text-sm font-mono font-bold text-orange-300">
            {done ? 'DUMP COMPLETATO' : 'FIRMWARE DUMP'}
          </span>
        </div>

        {/* Tool name */}
        <p className="text-[10px] text-gray-400 font-mono mb-3">{tool.name} · SPI Flash Reader</p>

        {/* Hex lines animation */}
        <div className="bg-black/50 rounded p-2 mb-4 font-mono text-[9px] text-green-400/70 overflow-hidden h-16">
          {!done ? (
            <HexScrollDisplay progress={progress} />
          ) : (
            <div className="text-green-400">
              <div>READ OK — {cfg.fileName || 'firmware.bin'}</div>
              <div className="text-gray-500">CRC32: {Math.random().toString(16).slice(2, 10).toUpperCase()}</div>
              <div className="text-orange-300">✓ Pronto per il download</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1">
            <span>Lettura flash...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        {done ? (
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold transition-colors"
            >
              Download {cfg.fileName || 'firmware.bin'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs transition-colors"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-gray-500 text-center font-mono">In corso — non disconnettere le sonde</p>
        )}
      </div>
    </div>
  );
};

// Animazione righe hex che scorrono durante il dump
const HEX_LINES = Array.from({ length: 12 }, (_, i) =>
  `${(i * 0x100).toString(16).padStart(8, '0').toUpperCase()}: ` +
  Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(' ')
);

const HexScrollDisplay = ({ progress }: { progress: number }) => {
  const lineIndex = Math.floor((progress / 100) * HEX_LINES.length);
  return (
    <div>
      {HEX_LINES.slice(0, lineIndex + 1).map((line, i) => (
        <div key={i} className={i === lineIndex ? 'text-green-300' : 'text-green-400/40'}>{line}</div>
      ))}
    </div>
  );
};

export default CustomToolRenderer;
