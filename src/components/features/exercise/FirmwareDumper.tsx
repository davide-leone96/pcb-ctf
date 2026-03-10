// src/components/features/exercise/FirmwareDumper.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useExerciseStore } from '@/store/exerciseStore';
import type { SpiRole } from '@/data/exercise';
import { cn } from '@/lib/utils';
import { HardDrive, Check, Download } from 'lucide-react';

interface FirmwareDumperProps {
  onPositionChange: (pos: { x: number; y: number } | null) => void;
  bounds: DOMRect | null;
}

export const SPI_WIRE_COLORS: Record<SpiRole, string> = {
  vcc: '#EF4444',
  gnd: '#6B7280',
  cs: '#A855F7',
  clk: '#3B82F6',
  mosi: '#22C55E',
  miso: '#FACC15',
};

const FirmwareDumper = ({ onPositionChange, bounds }: FirmwareDumperProps) => {
  const {
    exerciseData,
    firmwareDumpConnections, activeFirmwareProbeId, firmwareDumpStatus,
    selectFirmwareProbe, unhookFirmwareProbe,
    firmwareDumpPosition, setFirmwareDumpPosition,
    startFirmwareDump, completeFirmwareDump,
  } = useExerciseStore();

  const dumperRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dumpProgress, setDumpProgress] = useState(0);

  const fwConfig = exerciseData?.toolConfig?.firmwareDump;
  const probes = fwConfig?.probes ?? [];
  const requiredConnections = fwConfig?.requiredConnections ?? [];
  const dumpDuration = (fwConfig?.dumpDurationSec ?? 3) * 1000;

  // Check if all required connections are satisfied
  const allRequiredConnected = requiredConnections.length > 0 && requiredConnections.every(req => {
    const conn = firmwareDumpConnections.find(c => c.probeId === req.probeId);
    return conn?.pinId === req.pinId;
  });

  const connectedCount = firmwareDumpConnections.filter(c => c.pinId !== null).length;

  // Initial positioning
  useEffect(() => {
    if (bounds && !firmwareDumpPosition && dumperRef.current) {
      const padding = 16;
      const newPos = { x: padding, y: padding };
      setFirmwareDumpPosition(newPos);
      onPositionChange(newPos);
    }
  }, [bounds, firmwareDumpPosition, onPositionChange, setFirmwareDumpPosition]);

  useEffect(() => {
    if (firmwareDumpPosition) {
      onPositionChange(firmwareDumpPosition);
    }
    return () => { onPositionChange(null); };
  }, [firmwareDumpPosition, onPositionChange]);

  // Drag handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dumperRef.current) return;
      const container = dumperRef.current.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - offset.x;
      const newY = e.clientY - containerRect.top - offset.y;
      const clampedX = Math.max(0, Math.min(newX, containerRect.width - dumperRef.current.offsetWidth));
      const clampedY = Math.max(0, Math.min(newY, containerRect.height - dumperRef.current.offsetHeight));
      const newPosition = { x: clampedX, y: clampedY };
      setFirmwareDumpPosition(newPosition);
      onPositionChange(newPosition);
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset, onPositionChange, setFirmwareDumpPosition]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dumperRef.current) return;
    if ((e.target as HTMLElement).closest('[data-probe-slot]')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    const rect = dumperRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  // Dump progress animation
  const handleStartDump = useCallback(() => {
    if (!allRequiredConnected || firmwareDumpStatus !== 'idle') return;
    startFirmwareDump();
    setDumpProgress(0);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / dumpDuration, 1);
      setDumpProgress(progress);
      if (progress >= 1) {
        clearInterval(interval);
        completeFirmwareDump();
      }
    }, 50);
  }, [allRequiredConnected, firmwareDumpStatus, dumpDuration, startFirmwareDump, completeFirmwareDump]);

  const handleDownload = () => {
    if (!fwConfig?.filePath) return;
    const a = document.createElement('a');
    a.href = fwConfig.filePath;
    a.download = fwConfig.fileName || 'firmware.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      ref={dumperRef}
      onMouseDown={handleMouseDown}
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-3 w-80 text-white shadow-2xl pointer-events-auto z-30 cursor-move ring-1 ring-white/10"
      style={firmwareDumpPosition ? { left: `${firmwareDumpPosition.x}px`, top: `${firmwareDumpPosition.y}px`, visibility: 'visible' } : { visibility: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <HardDrive className="h-5 w-5 text-orange-400" />
        <span className="text-sm font-semibold">SPI Flash Reader</span>
      </div>

      {probes.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-4">
          No SPI probes configured for this exercise.
        </div>
      ) : <>
      {/* Probe grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {probes.map((probe) => {
          const conn = firmwareDumpConnections.find(c => c.probeId === probe.id);
          const isActive = activeFirmwareProbeId === probe.id;
          const isConnected = conn?.pinId !== null;
          const color = SPI_WIRE_COLORS[probe.role] || probe.color;

          return (
            <div
              key={probe.id}
              data-probe-slot
              onClick={(e) => {
                e.stopPropagation();
                if (firmwareDumpStatus !== 'idle') return;
                if (isConnected) {
                  unhookFirmwareProbe(probe.id);
                } else {
                  selectFirmwareProbe(probe.id);
                }
              }}
              className={cn(
                'flex flex-col items-center p-2 rounded transition-all cursor-pointer',
                isActive ? 'bg-blue-600/30 ring-2 ring-blue-400' :
                isConnected ? 'bg-gray-700/50' : 'bg-gray-700/30 hover:bg-gray-600/30',
                firmwareDumpStatus !== 'idle' && 'opacity-60 cursor-default'
              )}
            >
              <div
                className={cn('w-5 h-5 rounded-full border-2 transition-colors', isActive && 'animate-pulse')}
                style={{
                  borderColor: color,
                  backgroundColor: isConnected ? color : 'transparent',
                }}
              />
              <span className="text-xs mt-1 font-mono" style={{ color }}>{probe.label}</span>
              <span className="text-[10px] text-gray-400">
                {isConnected ? 'linked' : isActive ? 'active' : 'click'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dump button / Progress / Download */}
      {firmwareDumpStatus === 'idle' && (
        <button
          onClick={(e) => { e.stopPropagation(); handleStartDump(); }}
          disabled={!allRequiredConnected}
          className={cn(
            'w-full py-2 rounded text-sm font-semibold transition-colors mb-2',
            allRequiredConnected
              ? 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
        >
          DUMP FIRMWARE
        </button>
      )}

      {firmwareDumpStatus === 'dumping' && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-orange-300 mb-1">
            <span>Reading flash...</span>
            <span>{Math.round(dumpProgress * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-100 rounded-full"
              style={{ width: `${dumpProgress * 100}%` }}
            />
          </div>
          <div className="mt-1 font-mono text-[10px] text-gray-500 truncate">
            {`0x${Math.floor(dumpProgress * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase()}`}
            {` / 0xFFFFFF`}
          </div>
        </div>
      )}

      {firmwareDumpStatus === 'complete' && (
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="w-full py-2 rounded text-sm font-semibold bg-green-700 hover:bg-green-600 text-white flex items-center justify-center gap-2 mb-2 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Download {fwConfig?.fileName || 'firmware.bin'}
        </button>
      )}

      {/* Status bar */}
      <div className={cn(
        'text-xs p-2 rounded text-center transition-colors',
        firmwareDumpStatus === 'complete' ? 'bg-green-900/40 text-green-400' :
        allRequiredConnected ? 'bg-orange-900/40 text-orange-400' :
        'bg-gray-700/30 text-gray-400'
      )}>
        {firmwareDumpStatus === 'complete' ? (
          <span className="flex items-center justify-center gap-1">
            <Check className="h-3 w-3" /> Dump complete!
          </span>
        ) : allRequiredConnected ? (
          'All connected — ready to dump'
        ) : (
          `${connectedCount}/${probes.length} connected`
        )}
      </div>
      </>}
    </div>
  );
};

export default FirmwareDumper;
