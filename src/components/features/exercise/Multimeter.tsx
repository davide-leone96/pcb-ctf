// src/components/features/exercise/Multimeter.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useExerciseStore, MultimeterMode } from '@/store/exerciseStore';
import { exerciseData } from '@/data/exercise';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Definiamo il tipo per la callback e i nuovi bounds
interface MultimeterProps {
  onPositionChange: (pos: { x: number; y: number } | null) => void;
  bounds: DOMRect | null; // Rettangolo di contenimento
}

const calculateValue = (
  mode: MultimeterMode,
  probe1PinId: string | null,
  probe2PinId: string | null
): string => {
  if (!probe1PinId) return '----';
  const pin1 = exerciseData.pins.find(p => p.id === probe1PinId);
  if (!pin1) return 'ERR';
  const value1 = mode === 'V' ? pin1.valueV : pin1.valueOhm;
  if (!probe2PinId) return value1.toFixed(2);
  const pin2 = exerciseData.pins.find(p => p.id === probe2PinId);
  if (!pin2) return 'ERR';
  const value2 = mode === 'V' ? pin2.valueV : pin2.valueOhm;
  if (mode === 'V') return Math.abs(value2 - value1).toFixed(2);
  return (value1 + value2).toFixed(2);
};

const Multimeter = ({ onPositionChange, bounds }: MultimeterProps) => {
  const { multimeterMode, setMultimeterMode, probe1, probe2 } = useExerciseStore();
  const multimeterRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // --- MODIFICA CHIAVE 1: Calcolo della posizione iniziale ---
  // Questo useEffect si attiva quando i bounds sono disponibili e imposta la posizione
  // iniziale del multimetro SOLO la prima volta.
  useEffect(() => {
    if (bounds && !position && multimeterRef.current) {
      const multimeterWidth = multimeterRef.current.offsetWidth;
      const padding = 16; // 1rem
      
      const initialX = bounds.right - multimeterWidth - padding;
      const initialY = bounds.top + padding;
      
      setPosition({ x: initialX, y: initialY });
    }
  }, [bounds, position]);


  useEffect(() => {
    return () => { onPositionChange(null); };
  }, [onPositionChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !multimeterRef.current || !bounds) return;
      const newX = e.clientX - offset.x;
      const newY = e.clientY - offset.y;
      const clampedX = Math.max(bounds.left, Math.min(newX, bounds.right - multimeterRef.current.offsetWidth));
      const clampedY = Math.max(bounds.top, Math.min(newY, bounds.bottom - multimeterRef.current.offsetHeight));
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
    if (!multimeterRef.current) return;
    setIsDragging(true);
    const rect = multimeterRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  const displayValue = calculateValue(multimeterMode, probe1.hookedTo, probe2.hookedTo);
  const unit = multimeterMode === 'V' ? 'V' : 'Ω';

  return (
    <div
      ref={multimeterRef}
      onMouseDown={handleMouseDown}
      className="fixed bg-gray-800 border-2 border-gray-600 rounded-lg p-4 w-64 text-white shadow-lg pointer-events-auto z-20 cursor-move"
      // --- MODIFICA CHIAVE 2: Stile per la posizione ---
      // Rimane invisibile finché la sua posizione non è stata calcolata,
      // per evitare un "flash" nell'angolo in alto a sinistra.
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px`, visibility: 'visible' }
          : { visibility: 'hidden' }
      }
    >
      <div className="bg-green-900 border border-green-700 text-right p-2 rounded-md mb-4 select-none">
        <span className="text-4xl font-mono text-green-300">{displayValue}</span>
        <span className="text-2xl ml-2 text-green-300">{unit}</span>
      </div>
      <div className="flex justify-around">
        <Button onClick={() => setMultimeterMode('V')} className={cn(multimeterMode === 'V' && 'bg-blue-600 hover:bg-blue-500')} size="sm">Volt (V)</Button>
        <Button onClick={() => setMultimeterMode('Ohm')} className={cn(multimeterMode === 'Ohm' && 'bg-blue-600 hover:bg-blue-500')} size="sm">Ohm (Ω)</Button>
      </div>
    </div>
  );
};

export default Multimeter;