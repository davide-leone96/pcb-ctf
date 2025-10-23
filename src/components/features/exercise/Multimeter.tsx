// src/components/features/exercise/Multimeter.tsx
'use client';

import { useExerciseStore, MultimeterMode } from '@/store/exerciseStore';
import { exerciseData } from '@/data/exercise';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  if (mode === 'V') {
    return Math.abs(value2 - value1).toFixed(2);
  }
  return (value1 + value2).toFixed(2); // Resistenza in serie (esempio)
};

const Multimeter = () => {
  const { 
    multimeterMode, 
    setMultimeterMode,
    probe1,
    probe2
  } = useExerciseStore();

  const displayValue = calculateValue(multimeterMode, probe1.hookedTo, probe2.hookedTo);
  const unit = multimeterMode === 'V' ? 'V' : 'Ω';

  return (
    <div className="absolute top-4 right-4 bg-gray-800 border-2 border-gray-600 rounded-lg p-4 w-64 text-white shadow-lg pointer-events-auto z-20">
      <div className="bg-green-900 border border-green-700 text-right p-2 rounded-md mb-4">
        <span className="text-4xl font-mono text-green-300">{displayValue}</span>
        <span className="text-2xl ml-2 text-green-300">{unit}</span>
      </div>
      <div className="flex justify-around">
        <Button 
          onClick={() => setMultimeterMode('V')}
          className={cn(multimeterMode === 'V' && 'bg-blue-600 hover:bg-blue-500')}
          size="sm"
        >Volt (V)</Button>
        <Button 
          onClick={() => setMultimeterMode('Ohm')}
          className={cn(multimeterMode === 'Ohm' && 'bg-blue-600 hover:bg-blue-500')}
          size="sm"
        >Ohm (Ω)</Button>
      </div>
    </div>
  );
};

export default Multimeter;