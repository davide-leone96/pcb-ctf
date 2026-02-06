// src/components/features/exercise/PCBViewer.tsx
'use client';

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

const LENS_RADIUS = 120;
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
  const [multimeterPosition, setMultimeterPosition] = useState<{ x: number; y: number } | null>(null);
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  
  // --- MODIFICA 1: Stato per la posizione iniziale ---
  const [initialMultimeterPos, setInitialMultimeterPos] = useState<{ x: number, y: number } | null>(null);
  const [, setScrollTick] = useState(0);

  // Force re-render on scroll so cable positions recalculate via getBoundingClientRect
  useEffect(() => {
    const handleScroll = () => setScrollTick(prev => prev + 1);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useLayoutEffect(() => {
    const pcbElement = pcbContainerRef.current?.parentElement;
    if (!pcbElement) return;
    const updateDimensionsAndBounds = () => {
      if (pcbContainerRef.current) {
        setContainerDims({
          width: pcbContainerRef.current.offsetWidth,
          height: pcbContainerRef.current.offsetHeight,
        });
        
        // --- MODIFICA 2: Calcola la posizione iniziale qui ---
        const currentBounds = pcbElement.getBoundingClientRect();
        setBounds(currentBounds);
        const multimeterWidth = 256; // 64 * 4 (w-64)
        const padding = 16;
        setInitialMultimeterPos({
            x: currentBounds.right - multimeterWidth - padding,
            y: currentBounds.top + padding,
        });
      }
    };
    setImageUrl(window.location.origin + exerciseData.pcbImage);
    updateDimensionsAndBounds();
    window.addEventListener('resize', updateDimensionsAndBounds);
    return () => window.removeEventListener('resize', updateDimensionsAndBounds);
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'multimeter' && snapTarget) hookProbe();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pcbContainerRef.current) return;
    const rect = pcbContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    if (activeTool === 'magnifier') updateMousePosition({ x: mouseX, y: mouseY });
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
      if (snapTarget !== closestPin) setSnapTarget(closestPin);
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
    return { x: (left + width / 2) * containerDims.width / 100, y: (top + height / 2) * containerDims.height / 100 };
  };
  
  const probe1Pos = getPinPosition(probe1.hookedTo);
  const probe2Pos = getPinPosition(probe2.hookedTo);
  let activeProbePos = mousePosition;
  if(snapTarget && activeProbe) {
    const snapPos = getPinPosition(snapTarget);
    if(snapPos) activeProbePos = snapPos;
  }
  
  const getWireOrigin = (probeNumber: 'first' | 'second') => {
    // --- MODIFICA 3: Usa la posizione trascinata se esiste, altrimenti quella iniziale ---
    const currentMultimeterPos = multimeterPosition || initialMultimeterPos;
    if (!currentMultimeterPos || !pcbContainerRef.current) return null;

    const pcbRect = pcbContainerRef.current.getBoundingClientRect();
    const relativeX = currentMultimeterPos.x - pcbRect.left;
    const relativeY = currentMultimeterPos.y - pcbRect.top;
    const offsetX = probeNumber === 'first' ? 30 : 220;
    const offsetY = 120;
    return { x: relativeX + offsetX, y: relativeY + offsetY };
  };

  const wireOrigin1 = getWireOrigin('first');
  const wireOrigin2 = getWireOrigin('second');
  const componentToFind = exerciseData.components[currentStep];

  const getCurvePath = (start: {x: number, y: number} | null, end: {x: number, y: number} | null) => {
    if (!start || !end) return "";
    const cx = (start.x + end.x) / 2;
    const cy = Math.max(start.y, end.y) + 60;
    return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
  };

  return (
    <div
      ref={pcbContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
      className={cn( 'relative', activeTool === 'magnifier' ? 'cursor-none' : '', activeTool === 'multimeter' && activeProbe ? 'cursor-none' : '' )}
    >
      <Image src={exerciseData.pcbImage} alt="Vista PCB" width={1024} height={768} priority className="h-auto w-full block rounded-lg" draggable={false}/>
      
      {activeTool === 'multimeter' && <Multimeter onPositionChange={setMultimeterPosition} bounds={bounds} />}

      <div className="absolute inset-0 pointer-events-none z-10">
        {activeTool === 'multimeter' && (
            <svg width="100%" height="100%" className="absolute inset-0" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' }}>
              <defs><filter id="shadow"><feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.4)"/></filter></defs>
              
              {/* === LOGICA DI RENDERING DEI CAVI CORRETTA E SEMPLIFICATA === */}

              {/* Se il puntale 1 è attivo, disegna il suo cavo che segue il mouse */}
              {activeProbe === 'first' && (
                <path d={getCurvePath(wireOrigin1, activeProbePos)} stroke="#EF4444" strokeWidth="4" fill="none" />
              )}
              {/* Altrimenti, se è agganciato, disegna il cavo fisso */}
              {probe1Pos && activeProbe !== 'first' && (
                <path d={getCurvePath(wireOrigin1, probe1Pos)} stroke="#EF4444" strokeWidth="4" fill="none" />
              )}
              
              {/* Se il puntale 2 è attivo, disegna il suo cavo che segue il mouse */}
              {activeProbe === 'second' && (
                <path d={getCurvePath(wireOrigin2, activeProbePos)} stroke="black" strokeWidth="4" fill="none" />
              )}
              {/* Altrimenti, se è agganciato, disegna il cavo fisso */}
              {probe2Pos && activeProbe !== 'second' && (
                <path d={getCurvePath(wireOrigin2, probe2Pos)} stroke="black" strokeWidth="4" fill="none" />
              )}

            </svg>
        )}
        {activeTool === 'magnifier' && mousePosition && imageUrl && containerDims.width > 0 && <div className="absolute rounded-full border-4 border-blue-500 shadow-lg" style={{ left: mousePosition.x, top: mousePosition.y, transform: 'translate(-50%, -50%)', width: LENS_RADIUS * 2, height: LENS_RADIUS * 2, backgroundImage: `url(${imageUrl})`, backgroundSize: `${containerDims.width * ZOOM_LEVEL}px ${containerDims.height * ZOOM_LEVEL}px`, backgroundPosition: `-${mousePosition.x * ZOOM_LEVEL - LENS_RADIUS}px -${mousePosition.y * ZOOM_LEVEL - LENS_RADIUS}px`, backgroundRepeat: 'no-repeat'}}/>}
      </div>

      <div className="absolute inset-0">
        {activeTool === 'multimeter' && (
          <>
            <div className="group" style={probe1Pos ? { position: 'absolute', left: probe1Pos.x - 12, top: probe1Pos.y - 12, zIndex: 20 } : { display: 'none' }}>
              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white/50 shadow-md"/>
              <div className="absolute -inset-2 pointer-events-auto cursor-pointer" onClick={(e) => {e.stopPropagation(); unhookProbe('first');}}><XCircle size={16} className="text-white bg-red-600 rounded-full absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"/></div>
            </div>
            <div className="group" style={probe2Pos ? { position: 'absolute', left: probe2Pos.x - 12, top: probe2Pos.y - 12, zIndex: 20 } : { display: 'none' }}>
              <div className="w-6 h-6 bg-black rounded-full border-2 border-white/50 shadow-md"/>
              <div className="absolute -inset-2 pointer-events-auto cursor-pointer" onClick={(e) => {e.stopPropagation(); unhookProbe('second');}}><XCircle size={16} className="text-white bg-gray-700 rounded-full absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"/></div>
            </div>
            {activeProbe && activeProbePos && <div className="absolute pointer-events-none z-20" style={{ left: activeProbePos.x - 12, top: activeProbePos.y - 12}}><div className={cn("w-6 h-6 rounded-full border-2 bg-white/20 animate-probe-pulse", activeProbe === 'first' ? 'border-red-500' : 'border-black')} /></div>}
            {exerciseData.pins.map(pin => <div key={pin.id} className={cn('absolute border border-dashed pointer-events-auto transition-colors', snapTarget === pin.id ? 'border-yellow-400 bg-yellow-400/30 border-solid' : 'border-cyan-400/30')} style={{ left: `${pin.coords[0]}%`, top: `${pin.coords[1]}%`, width: `${pin.coords[2]}%`, height: `${pin.coords[3]}%`}}/>)}
          </>
        )}
        {activeTool === 'pointer' && exerciseData.components.map((component) => {
          const [left, top, width, height] = component.coords;
          const isFound = foundComponents.includes(component.id);
          const isTarget = component.id === componentToFind?.id && !isFinished;
          let hotspotClass = 'absolute transition-all duration-300 pointer-events-auto cursor-pointer';
          if (isFound) hotspotClass += ' bg-green-500/30 border-2 border-green-400 rounded-md';
          else if (isTarget) hotspotClass += ' bg-yellow-400/20 border-2 border-yellow-300 rounded-md animate-pulse';
          else hotspotClass += ' hover:bg-white/10 rounded-md';
          return <div key={component.id} onClick={(e) => { e.stopPropagation(); selectComponent(component.id); }} className={hotspotClass} style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`}}/>
        })}
      </div>
    </div>
  );
};

export default PCBViewer;