// src/components/features/exercise/UartProbesAdapter.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useExerciseStore, AdapterPin } from '@/store/exerciseStore';
import { cn } from '@/lib/utils';
import { Usb, Check, AlertTriangle } from 'lucide-react';

interface UartProbesAdapterProps {
  onPositionChange: (pos: { x: number; y: number } | null) => void;
  bounds: DOMRect | null;
}

const WIRE_COLORS: Record<AdapterPin, string> = {
  'adapter-tx': '#22C55E',
  'adapter-rx': '#FACC15',
  'adapter-gnd': '#6B7280',
};

const ADAPTER_PINS: { pin: AdapterPin; label: string }[] = [
  { pin: 'adapter-tx', label: 'TX' },
  { pin: 'adapter-rx', label: 'RX' },
  { pin: 'adapter-gnd', label: 'GND' },
];

const UartProbesAdapter = ({ onPositionChange, bounds }: UartProbesAdapterProps) => {
  const {
    uartConnections, activeAdapterPin, uartConnected,
    selectAdapterPin, unhookUartProbe,
  } = useExerciseStore();

  const adapterRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (bounds && !position && adapterRef.current) {
      const padding = 16;
      const initialX = bounds.left + padding;
      const initialY = bounds.top + padding;
      setPosition({ x: initialX, y: initialY });
    }
  }, [bounds, position]);

  useEffect(() => {
    return () => { onPositionChange(null); };
  }, [onPositionChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !adapterRef.current || !bounds) return;
      const newX = e.clientX - offset.x;
      const newY = e.clientY - offset.y;
      const clampedX = Math.max(bounds.left, Math.min(newX, bounds.right - adapterRef.current.offsetWidth));
      const clampedY = Math.max(bounds.top, Math.min(newY, bounds.bottom - adapterRef.current.offsetHeight));
      const newPosition = { x: clampedX, y: clampedY };
      setPosition(newPosition);
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
  }, [isDragging, offset, onPositionChange, bounds]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!adapterRef.current) return;
    // Non avviare drag se il click è su un pin slot
    if ((e.target as HTMLElement).closest('[data-pin-slot]')) return;
    setIsDragging(true);
    const rect = adapterRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  const connectedCount = uartConnections.filter(c => c.pcbPinId !== null).length;
  const allConnected = connectedCount === 3;

  // Determina se le connessioni sono tutte fatte ma sbagliate
  const hasWrongConnections = allConnected && !uartConnected;

  return (
    <div
      ref={adapterRef}
      onMouseDown={handleMouseDown}
      className="fixed bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-3 w-72 text-white shadow-2xl pointer-events-auto z-30 cursor-move ring-1 ring-white/10"
      style={position ? { left: `${position.x}px`, top: `${position.y}px`, visibility: 'visible' } : { visibility: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <Usb className="h-5 w-5 text-blue-400" />
        <span className="text-sm font-semibold">Adattatore USB-to-Serial</span>
      </div>

      {/* Pin slots */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {/* VCC - disabilitato */}
        <div className="flex flex-col items-center p-2 rounded bg-gray-700/30 opacity-40">
          <div className="w-5 h-5 rounded-full border-2 border-red-400 bg-red-400/20" />
          <span className="text-xs mt-1 text-red-300 font-mono">VCC</span>
          <span className="text-[10px] text-gray-500">N/C</span>
        </div>

        {/* TX, RX, GND */}
        {ADAPTER_PINS.map(({ pin, label }) => {
          const conn = uartConnections.find(c => c.adapterPin === pin);
          const isActive = activeAdapterPin === pin;
          const isConnected = conn?.pcbPinId !== null;
          const color = WIRE_COLORS[pin];

          return (
            <div
              key={pin}
              data-pin-slot
              onClick={(e) => {
                e.stopPropagation();
                if (isConnected) {
                  unhookUartProbe(pin);
                } else {
                  selectAdapterPin(pin);
                }
              }}
              className={cn(
                'flex flex-col items-center p-2 rounded cursor-pointer transition-all',
                isActive ? 'bg-blue-600/30 ring-2 ring-blue-400' :
                isConnected ? 'bg-gray-700/50' : 'bg-gray-700/30 hover:bg-gray-600/30'
              )}
            >
              <div
                className={cn('w-5 h-5 rounded-full border-2 transition-colors', isActive && 'animate-pulse')}
                style={{
                  borderColor: color,
                  backgroundColor: isConnected ? color : 'transparent',
                }}
              />
              <span className="text-xs mt-1 font-mono" style={{ color }}>{label}</span>
              <span className="text-[10px] text-gray-400">
                {isConnected ? 'linked' : isActive ? 'attivo' : 'click'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status bar */}
      <div className={cn(
        'text-xs p-2 rounded text-center transition-colors',
        uartConnected ? 'bg-green-900/40 text-green-400' :
        hasWrongConnections ? 'bg-red-900/40 text-red-400' :
        'bg-gray-700/30 text-gray-400'
      )}>
        {uartConnected ? (
          <span className="flex items-center justify-center gap-1">
            <Check className="h-3 w-3" /> Connessione UART attiva!
          </span>
        ) : hasWrongConnections ? (
          <span className="flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Verifica crossover TX/RX
          </span>
        ) : (
          `${connectedCount}/3 collegati`
        )}
      </div>
    </div>
  );
};

export { WIRE_COLORS };
export default UartProbesAdapter;
