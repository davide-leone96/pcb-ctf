// src/components/features/exercise/PCBViewer.tsx

import Image from 'next/image';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { exerciseData } from '@/data/exercise';
import { useExerciseStore } from '@/store/exerciseStore';
import { cn } from '@/lib/utils';
import { Wrench, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import Multimeter from './Multimeter';

const LENS_RADIUS = 50;
const ZOOM_LEVEL = 2.5;
const SNAP_RADIUS = 15;

const PCBViewer = () => {
  const {
    currentStep, foundComponents, selectComponent, isFinished,
    activeTool, mousePosition, updateMousePosition,
    measuredComponentId, measureComponent, clearMeasurement,
    multimeterMode, activeProbe, probe1, probe2, snapTarget,
    setSnapTarget, hookProbe, unhookProbe,
  } = useExerciseStore();

  const pcbContainerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (pcbContainerRef.current) {
        setContainerDims({
          width: pcbContainerRef.current.offsetWidth,
          height: pcbContainerRef.current.offsetHeight,
        });
      }
    };
    setImageUrl(window.location.origin + exerciseData.pcbImage);
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (activeTool === 'multimeter' && snapTarget) {
      hookProbe();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pcbContainerRef.current) return;
    const rect = pcbContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (activeTool === 'magnifier') {
      updateMousePosition({ x: mouseX, y: mouseY });
    }

    if (activeTool === 'multimeter' && activeProbe) {
      updateMousePosition({ x: mouseX, y: mouseY });

      let closestPin = null;
      let minDistance = SNAP_RADIUS;

      exerciseData.pins.forEach(pin => {
        const [left, top, width, height] = pin.coords;
        const pinX = (left + width / 2) * containerDims.width / 100;
        const pinY = (top + height / 2) * containerDims.height / 100;
        
        const distance = Math.sqrt(Math.pow(mouseX - pinX, 2) + Math.pow(mouseY - pinY, 2));

        if (distance < minDistance) {
          minDistance = distance;
          closestPin = pin.id;
        }
      });
      if (snapTarget !== closestPin) {
        setSnapTarget(closestPin);
      }
    } else if (snapTarget) {
      setSnapTarget(null);
    }
  };

  const handleMouseLeave = () => {
    updateMousePosition(null);
    setSnapTarget(null);
  };
  
  const getPinPosition = (pinId: string | null) => {
    if (!pinId || containerDims.width === 0) return null;
    const pin = exerciseData.pins.find(p => p.id === pinId);
    if (!pin) return null;
    const [left, top, width, height] = pin.coords;
    return {
      x: (left + width / 2) * containerDims.width / 100,
      y: (top + height / 2) * containerDims.height / 100,
    };
  }
  
  const probe1Pos = getPinPosition(probe1.hookedTo);
  const probe2Pos = getPinPosition(probe2.hookedTo);
  let activeProbePos = mousePosition;
  if(snapTarget && activeProbe) {
    const snapPos = getPinPosition(snapTarget);
    if(snapPos) activeProbePos = snapPos;
  }

  const componentToFind = exerciseData.components[currentStep];

  return (
    <div
      ref={pcbContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
      className={cn(
        'relative',
        activeTool === 'magnifier' ? 'cursor-none' : '',
        activeTool === 'multimeter' && activeProbe ? 'cursor-none' : ''
      )}
    >
      <Image
        src={exerciseData.pcbImage}
        alt="Vista di un circuito stampato (PCB) per l'esercizio."
        width={1024} height={768} priority
        className="h-auto w-full block rounded-lg" draggable={false}
      />
      
      {activeTool === 'multimeter' && <Multimeter />}

      <div className="absolute inset-0 pointer-events-none">
        {/* === ELEMENTI PER IL MULTIMETRO === */}
        {activeTool === 'multimeter' && (
          <>
            <svg width="100%" height="100%" className="absolute inset-0">
              {probe1Pos && activeProbe === 'second' && activeProbePos && (
                <line x1="90%" y1="5%" x2={activeProbePos.x} y2={activeProbePos.y} stroke="black" strokeWidth="3" />
              )}
              {probe1Pos && probe2Pos && (
                <line x1="90%" y1="5%" x2={probe2Pos.x} y2={probe2Pos.y} stroke="black" strokeWidth="3" />
              )}
              {probe1Pos && (
                <line x1="80%" y1="5%" x2={probe1Pos.x} y2={probe1Pos.y} stroke="red" strokeWidth="3" />
              )}
            </svg>
            
            {/* --- MODIFICA CHIAVE QUI --- */}
            {probe1Pos && (
              <div 
                className="absolute pointer-events-auto cursor-pointer z-10" 
                style={{ left: probe1Pos.x - 8, top: probe1Pos.y - 8}} 
                onClick={(e) => { e.stopPropagation(); unhookProbe('first'); }}
              >
                <XCircle size={16} className="text-red-500 bg-white rounded-full"/>
              </div>
            )}
            {probe2Pos && (
              <div 
                className="absolute pointer-events-auto cursor-pointer z-10" 
                style={{ left: probe2Pos.x - 8, top: probe2Pos.y - 8}} 
                onClick={(e) => { e.stopPropagation(); unhookProbe('second'); }}
              >
                <XCircle size={16} className="text-black bg-white rounded-full"/>
              </div>
            )}
            {/* --- FINE MODIFICA --- */}

            {activeProbe && activeProbePos && (
              <div className="absolute" style={{ left: activeProbePos.x - 12, top: activeProbePos.y - 12}}>
                <div className={cn("w-6 h-6 rounded-full border-2", activeProbe === 'first' ? 'border-red-500' : 'border-black')} />
              </div>
            )}
            {exerciseData.pins.map(pin => (
              <div
                key={pin.id}
                className={cn(
                  'absolute border border-dashed pointer-events-auto',
                  snapTarget === pin.id ? 'border-yellow-400 bg-yellow-400/30' : 'border-cyan-400/50'
                )}
                style={{
                  left: `${pin.coords[0]}%`, top: `${pin.coords[1]}%`,
                  width: `${pin.coords[2]}%`, height: `${pin.coords[3]}%`
                }}
              />
            ))}
          </>
        )}

        {/* === ELEMENTI PER LA SELEZIONE COMPONENTI (PUNTATORE) === */}
        {activeTool === 'pointer' && exerciseData.components.map((component) => {
          const [left, top, width, height] = component.coords;
          const isFound = foundComponents.includes(component.id);
          const isTarget = component.id === componentToFind?.id && !isFinished;
          let hotspotClass = 'absolute transition-all duration-300 pointer-events-auto cursor-pointer';

          if (isFound) hotspotClass += ' bg-green-500/30 border-2 border-green-400';
          else if (isTarget) hotspotClass += ' bg-yellow-400/20 border-2 border-yellow-300 animate-pulse';
          else hotspotClass += ' hover:bg-red-500/20';

          return (
            <div
              key={component.id}
              onClick={(e) => { e.stopPropagation(); selectComponent(component.id); }}
              className={hotspotClass}
              style={{
                left: `${left}%`, top: `${top}%`,
                width: `${width}%`, height: `${height}%`,
              }}
            />
          );
        })}

        {/* === ELEMENTI PER LA LENTE === */}
        {activeTool === 'magnifier' && mousePosition && imageUrl && containerDims.width > 0 && (
          <div
            className="absolute rounded-full border-4 border-blue-500 shadow-lg"
            style={{
              left: mousePosition.x, top: mousePosition.y,
              transform: 'translate(-50%, -50%)',
              width: LENS_RADIUS * 2, height: LENS_RADIUS * 2,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${containerDims.width * ZOOM_LEVEL}px ${containerDims.height * ZOOM_LEVEL}px`,
              backgroundPosition: `-${mousePosition.x * ZOOM_LEVEL - LENS_RADIUS}px -${mousePosition.y * ZOOM_LEVEL - LENS_RADIUS}px`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PCBViewer;