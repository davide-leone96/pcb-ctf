// src/components/features/exercise/Multimeter.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useExerciseStore, MultimeterMode } from '@/store/exerciseStore';
import { exerciseData } from '@/data/exercise';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Zap, Sigma } from 'lucide-react';

interface MultimeterProps {
  onPositionChange: (pos: { x: number; y: number } | null) => void;
  bounds: DOMRect | null;
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

  useEffect(() => {
    if (bounds && !position && multimeterRef.current) {
      const multimeterWidth = multimeterRef.current.offsetWidth;
      const padding = 16;
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
      className="fixed bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-3 w-64 text-white shadow-2xl pointer-events-auto z-30 cursor-move ring-1 ring-white/10"
      style={position ? { left: `${position.x}px`, top: `${position.y}px`, visibility: 'visible' } : { visibility: 'hidden' }}
    >
      <div className="bg-cyan-900/50 backdrop-blur-sm border border-cyan-700 text-right p-2 rounded-md mb-3 shadow-inner select-none">
        <span className="text-4xl font-mono text-cyan-300 text-shadow-lcd">{displayValue}</span>
        <span className="text-2xl ml-2 text-cyan-300/80">{unit}</span>
      </div>
      <div className="flex justify-around bg-black/20 p-1 rounded-md">
        <Button onClick={() => setMultimeterMode('V')} variant="ghost" className={cn("full-1/2 transition-colors", multimeterMode === 'V' && 'bg-blue-600/50 hover:bg-blue-600/60')} size="sm"><Zap className="mr-2 h-4 w-4"/> Volt (V)</Button>
        <Button onClick={() => setMultimeterMode('Ohm')} variant="ghost" className={cn("full-1/2 transition-colors", multimeterMode === 'Ohm' && 'bg-blue-600/50 hover:bg-blue-600/60')} size="sm"><Sigma className="mr-2 h-4 w-4"/> Ohm (Ω)</Button>
      </div>
    </div>
  );
};

export default Multimeter;