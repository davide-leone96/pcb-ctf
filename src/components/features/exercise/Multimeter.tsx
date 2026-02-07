// src/components/features/exercise/Multimeter.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useExerciseStore, MultimeterMode } from '@/store/exerciseStore';
import { getPinValues } from '@/data/exercise';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Zap, Sigma } from 'lucide-react';

interface MultimeterProps {
  onPositionChange: (pos: { x: number; y: number } | null) => void;
  bounds: DOMRect | null;
}

/**
 * Calcola il valore visualizzato dal multimetro in modo realistico.
 * - V mode, 1 sonda (rossa): tensione del pin rispetto a massa implicita
 * - V mode, 2 sonde: V(rossa) - V(nera) con segno
 * - Ohm mode, 1 sonda: "OL" (circuito aperto)
 * - Ohm mode, 2 sonde: resistenza tra i due punti
 */
const calculateReading = (
  mode: MultimeterMode,
  probe1PinId: string | null,
  probe2PinId: string | null,
): { display: string; numeric: number | null } => {
  if (!probe1PinId) return { display: '----', numeric: null };

  const pin1 = getPinValues(probe1PinId);
  if (!pin1) return { display: 'ERR', numeric: null };

  if (mode === 'V') {
    if (!probe2PinId) {
      // Tensione singola rispetto a GND implicito
      return { display: pin1.valueV.toFixed(2), numeric: pin1.valueV };
    }
    const pin2 = getPinValues(probe2PinId);
    if (!pin2) return { display: 'ERR', numeric: null };
    // V(rossa) - V(nera): differenza con segno
    const diff = pin1.valueV - pin2.valueV;
    const sign = diff < 0 ? '-' : '';
    return { display: `${sign}${Math.abs(diff).toFixed(2)}`, numeric: diff };
  }

  // Ohm mode
  if (!probe2PinId) {
    // Circuito aperto: non si può misurare con un solo puntale
    return { display: ' OL', numeric: null };
  }
  const pin2 = getPinValues(probe2PinId);
  if (!pin2) return { display: 'ERR', numeric: null };
  const totalR = pin1.valueOhm + pin2.valueOhm;
  if (totalR > 99999) return { display: ' OL', numeric: null };
  return { display: totalR.toFixed(0), numeric: totalR };
};

const Multimeter = ({ onPositionChange, bounds }: MultimeterProps) => {
  const { multimeterMode, setMultimeterMode, probe1, probe2, activeProbe, selectProbe } = useExerciseStore();
  const multimeterRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [noise, setNoise] = useState(0);

  // Fluttuazione realistica dell'ultimo digit
  useEffect(() => {
    const interval = setInterval(() => {
      setNoise((Math.random() - 0.5) * 0.04);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bounds && !position && multimeterRef.current) {
      const multimeterWidth = multimeterRef.current.offsetWidth;
      const padding = 16;
      const initialX = bounds.width - multimeterWidth - padding;
      const initialY = padding;
      const newPos = { x: initialX, y: initialY };
      setPosition(newPos);
      onPositionChange(newPos);
    }
  }, [bounds, position, onPositionChange]);

  useEffect(() => {
    return () => { onPositionChange(null); };
  }, [onPositionChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !multimeterRef.current) return;
      const container = multimeterRef.current.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - offset.x;
      const newY = e.clientY - containerRect.top - offset.y;
      const clampedX = Math.max(0, Math.min(newX, containerRect.width - multimeterRef.current.offsetWidth));
      const clampedY = Math.max(0, Math.min(newY, containerRect.height - multimeterRef.current.offsetHeight));
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
  }, [isDragging, offset, onPositionChange]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!multimeterRef.current) return;
    setIsDragging(true);
    const rect = multimeterRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  const { display, numeric } = calculateReading(multimeterMode, probe1.hookedTo, probe2.hookedTo);

  // Applica il rumore solo ai valori numerici reali
  let displayValue = display;
  if (numeric !== null) {
    const noisy = numeric + noise;
    if (multimeterMode === 'V') {
      const sign = noisy < 0 ? '-' : '';
      displayValue = `${sign}${Math.abs(noisy).toFixed(2)}`;
    } else {
      displayValue = Math.max(0, noisy).toFixed(0);
    }
  }

  const unit = multimeterMode === 'V' ? 'V' : 'Ω';

  return (
    <div
      ref={multimeterRef}
      onMouseDown={handleMouseDown}
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-3 w-64 text-white shadow-2xl pointer-events-auto z-30 cursor-move ring-1 ring-white/10"
      style={position ? { left: `${position.x}px`, top: `${position.y}px`, visibility: 'visible' } : { visibility: 'hidden' }}
    >
      <div className="bg-cyan-900/50 backdrop-blur-sm border border-cyan-700 text-right p-2 rounded-md mb-3 shadow-inner select-none">
        <span className="text-4xl font-mono text-cyan-300 text-shadow-lcd">{displayValue}</span>
        <span className="text-2xl ml-2 text-cyan-300/80">{unit}</span>
      </div>
      {/* Indicatore stato sonde - Cliccabili per selezionare */}
      <div className="flex justify-between text-[10px] text-gray-500 px-1 mb-2 font-mono">
        <span
          onClick={(e) => {
            e.stopPropagation();
            selectProbe('first');
          }}
          className={cn(
            "cursor-pointer hover:text-white transition-colors px-1 py-0.5 rounded",
            activeProbe === 'first' && "bg-red-500/20 text-white ring-1 ring-red-500"
          )}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1 align-middle" />
          {probe1.hookedTo ? 'V+' : '---'}
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            selectProbe('second');
          }}
          className={cn(
            "cursor-pointer hover:text-white transition-colors px-1 py-0.5 rounded",
            activeProbe === 'second' && "bg-gray-500/20 text-white ring-1 ring-gray-500"
          )}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-black border border-gray-500 mr-1 align-middle" />
          {probe2.hookedTo ? 'COM' : '---'}
        </span>
      </div>
      <div className="flex justify-around bg-black/20 p-1 rounded-md">
        <Button onClick={() => setMultimeterMode('V')} variant="ghost" className={cn("full-1/2 transition-colors", multimeterMode === 'V' && 'bg-blue-600/50 hover:bg-blue-600/60')} size="sm"><Zap className="mr-2 h-4 w-4"/> Volt (V)</Button>
        <Button onClick={() => setMultimeterMode('Ohm')} variant="ghost" className={cn("full-1/2 transition-colors", multimeterMode === 'Ohm' && 'bg-blue-600/50 hover:bg-blue-600/60')} size="sm"><Sigma className="mr-2 h-4 w-4"/> Ohm (Ω)</Button>
      </div>
    </div>
  );
};

export default Multimeter;
