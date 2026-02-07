// src/components/features/exercise/PCBViewer.tsx
'use client';

import Image from 'next/image';
import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { exerciseData, getAllPins, getPinCoords } from '@/data/exercise';
import { useExerciseStore } from '@/store/exerciseStore';
import { cn } from '@/lib/utils';
import { XCircle } from 'lucide-react';
import Multimeter from './Multimeter';
import UartProbesAdapter, { WIRE_COLORS } from './UartProbesAdapter';
import type { AdapterPin } from '@/store/exerciseStore';

const SNAP_RADIUS = 15;

const PCBViewer = () => {
  const {
    selectComponent,
    foundComponents,
    activeTool, mousePosition, updateMousePosition,
    activeProbe, probe1, probe2, snapTarget,
    setSnapTarget, hookProbe, unhookProbe,
    uartConnections, activeAdapterPin, uartSnapTarget,
    setUartSnapTarget, hookUartProbe, unhookUartProbe, uartConnected,
    lensRadius, lensZoomLevel, lensVisible, lensIsAnchored, lensAnchorPosition,
    toggleLensAnchor, setLensAnchorPosition,
  } = useExerciseStore();

  const pcbContainerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const [multimeterPosition, setMultimeterPosition] = useState<{ x: number; y: number } | null>(null);
  const [adapterPosition, setAdapterPosition] = useState<{ x: number; y: number } | null>(null);
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const [isDraggingLens, setIsDraggingLens] = useState(false);

  useLayoutEffect(() => {
    const pcbElement = pcbContainerRef.current?.parentElement;
    if (!pcbElement) return;
    const updateDimensionsAndBounds = () => {
      if (pcbContainerRef.current) {
        setContainerDims({
          width: pcbContainerRef.current.offsetWidth,
          height: pcbContainerRef.current.offsetHeight,
        });
        const currentBounds = pcbElement.getBoundingClientRect();
        setBounds(currentBounds);
      }
    };
    setImageUrl(window.location.origin + exerciseData.pcbImage);
    updateDimensionsAndBounds();
    window.addEventListener('resize', updateDimensionsAndBounds);
    return () => window.removeEventListener('resize', updateDimensionsAndBounds);
  }, []);

  useEffect(() => {
    if (!isDraggingLens) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (pcbContainerRef.current) {
        const rect = pcbContainerRef.current.getBoundingClientRect();
        setLensAnchorPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDraggingLens(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingLens, setLensAnchorPosition]);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (activeTool === 'multimeter' && snapTarget) hookProbe();
    if (activeTool === 'probes' && uartSnapTarget) hookUartProbe();

    // Permetti ancoraggio lente se:
    // - activeTool è pointer (sempre)
    // - activeTool è multimeter con entrambi i puntali agganciati
    // - activeTool è probes con tutte e 3 le connessioni fatte
    const isMultimeterComplete = activeTool === 'multimeter' && probe1.hookedTo && probe2.hookedTo;
    const isUartComplete = activeTool === 'probes' && uartConnections.every(c => c.pcbPinId !== null);
    const canAnchorLens = activeTool === 'pointer' || isMultimeterComplete || isUartComplete;

    if (lensVisible && canAnchorLens && mousePosition && !isDraggingLens && !lensIsAnchored) {
      toggleLensAnchor();
    }
  };

  // Snap detection: cerca il pin più vicino in base al filter specificato
  const findClosestPin = (mouseX: number, mouseY: number, filterType: 'all' | 'uart-only' = 'all'): string | null => {
    if (!pcbContainerRef.current) return null;

    let closestPin: string | null = null;
    let minDistance = SNAP_RADIUS;
    const pinsToCheck = filterType === 'uart-only'
      ? getAllPins().filter(pin => pin.isUart)
      : getAllPins(); // 'all': cerca tra TUTTI i pin (measurement + UART)

    // Usa getBoundingClientRect() per calcolo preciso come il browser
    const containerRect = pcbContainerRef.current.getBoundingClientRect();

    pinsToCheck.forEach(pin => {
      const [left, top, width, height] = pin.coords;
      const pinX = (left + width / 2) * containerRect.width / 100;
      const pinY = (top + height / 2) * containerRect.height / 100;
      const distance = Math.sqrt(Math.pow(mouseX - pinX, 2) + Math.pow(mouseY - pinY, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestPin = pin.id;
      }
    });
    return closestPin;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pcbContainerRef.current) return;
    const rect = pcbContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Aggiorna sempre mousePosition se la lente è visibile e non ancorata (indipendentemente dal tool)
    if (lensVisible && !lensIsAnchored) {
      updateMousePosition({ x: mouseX, y: mouseY });
    }

    if (activeTool === 'multimeter' && activeProbe) {
      updateMousePosition({ x: mouseX, y: mouseY });
      const closest = findClosestPin(mouseX, mouseY, 'all'); // TUTTI i pin (measurement + UART)
      if (snapTarget !== closest) setSnapTarget(closest);
    } else if (snapTarget) {
      setSnapTarget(null);
    }
    if (activeTool === 'probes' && activeAdapterPin) {
      updateMousePosition({ x: mouseX, y: mouseY });
      const closest = findClosestPin(mouseX, mouseY, 'all'); // TUTTI i pin (measurement + UART)
      if (uartSnapTarget !== closest) setUartSnapTarget(closest);
    } else if (activeTool === 'probes' && uartSnapTarget) {
      setUartSnapTarget(null);
    }
  };

  const handleMouseLeave = () => {
    updateMousePosition(null);
    setSnapTarget(null);
    setUartSnapTarget(null);
  };
  
  // Posizione percentuale del centro di qualsiasi pin (measurement o UART)
  const getPinCenterPercent = (pinId: string | null): { x: number; y: number } | null => {
    if (!pinId) return null;
    const coords = getPinCoords(pinId);
    if (!coords) return null;
    const [left, top, width, height] = coords;
    return { x: left + width / 2, y: top + height / 2 };
  };

  // Posizione pixel di qualsiasi pin (measurement o UART)
  const getPinPosition = (pinId: string | null) => {
    if (!pinId || !pcbContainerRef.current) return null;
    const centerPercent = getPinCenterPercent(pinId);
    if (!centerPercent) return null;

    // Usa getBoundingClientRect() per calcolo preciso come il browser
    const containerRect = pcbContainerRef.current.getBoundingClientRect();
    return {
      x: centerPercent.x * containerRect.width / 100,
      y: centerPercent.y * containerRect.height / 100
    };
  };
  
  const probe1Percent = getPinCenterPercent(probe1.hookedTo);
  const probe2Percent = getPinCenterPercent(probe2.hookedTo);
  const snapTargetPercent = snapTarget ? getPinCenterPercent(snapTarget) : null;

  // Per i cavi SVG servono posizioni in pixel
  const probe1Pos = getPinPosition(probe1.hookedTo);
  const probe2Pos = getPinPosition(probe2.hookedTo);
  let activeProbePos = mousePosition;
  if (snapTarget && activeProbe) {
    const snapPos = getPinPosition(snapTarget);
    if (snapPos) activeProbePos = snapPos;
  }

  const getWireOrigin = (probeNumber: 'first' | 'second') => {
    if (!multimeterPosition) return null;
    const offsetX = probeNumber === 'first' ? 30 : 220;
    const offsetY = 120;
    return { x: multimeterPosition.x + offsetX, y: multimeterPosition.y + offsetY };
  };

  const wireOrigin1 = getWireOrigin('first');
  const wireOrigin2 = getWireOrigin('second');
  const getCurvePath = (start: {x: number, y: number} | null, end: {x: number, y: number} | null) => {
    if (!start || !end) return "";
    const cx = (start.x + end.x) / 2;
    const cy = Math.max(start.y, end.y) + 60;
    return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
  };

  const getUartWireOrigin = (adapterPin: AdapterPin) => {
    if (!adapterPosition) return null;
    const offsets: Record<AdapterPin, { x: number; y: number }> = {
      'adapter-tx':  { x: 100, y: 150 },
      'adapter-rx':  { x: 160, y: 150 },
      'adapter-gnd': { x: 220, y: 150 },
    };
    const o = offsets[adapterPin];
    return { x: adapterPosition.x + o.x, y: adapterPosition.y + o.y };
  };

  const uartSnapTargetPercent = uartSnapTarget ? getPinCenterPercent(uartSnapTarget) : null;

  // Per i cavi UART servono posizioni in pixel
  let activeUartProbePos = mousePosition;
  if (uartSnapTarget && activeAdapterPin) {
    const snapPos = getPinPosition(uartSnapTarget);
    if (snapPos) activeUartProbePos = snapPos;
  }

  // L'overlay UART (adapter, cavi, pallini) è visibile sia in modalità probes che terminal
  const showUartOverlay = activeTool === 'probes' || (activeTool === 'terminal' && uartConnected);

  return (
    <div
      ref={pcbContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
      className={cn( 'relative', activeTool === 'multimeter' && activeProbe ? 'cursor-none' : '', activeTool === 'probes' && activeAdapterPin ? 'cursor-none' : '' )}
    >
      <Image src={exerciseData.pcbImage} alt="Vista PCB" width={1024} height={768} priority className="h-auto w-full block rounded-lg" draggable={false}/>
      {activeTool === 'multimeter' && <Multimeter onPositionChange={setMultimeterPosition} bounds={bounds} />}
      {showUartOverlay && <UartProbesAdapter onPositionChange={setAdapterPosition} bounds={bounds} readOnly={activeTool !== 'probes'} />}

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
        {showUartOverlay && (
          <svg width="100%" height="100%" className="absolute inset-0" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' }}>
            {uartConnections.map(conn => {
              const wireOrigin = getUartWireOrigin(conn.adapterPin);
              const color = WIRE_COLORS[conn.adapterPin];

              if (conn.adapterPin === activeAdapterPin) {
                const endPos = uartSnapTarget ? getPinPosition(uartSnapTarget) : mousePosition;
                return <path key={conn.adapterPin} d={getCurvePath(wireOrigin, endPos)} stroke={color} strokeWidth="3" fill="none" strokeDasharray="8,4" opacity="0.7" />;
              }
              if (conn.pcbPinId) {
                const pinPos = getPinPosition(conn.pcbPinId);
                return <path key={conn.adapterPin} d={getCurvePath(wireOrigin, pinPos)} stroke={color} strokeWidth="3" fill="none" />;
              }
              return null;
            })}
          </svg>
        )}
        {lensVisible && imageUrl && containerDims.width > 0 && (() => {
          const lensPosition = lensIsAnchored && lensAnchorPosition ? lensAnchorPosition : mousePosition;
          if (!lensPosition) return null;

          // La lente può essere spostata se:
          // - activeTool è pointer (sempre)
          // - activeTool è multimeter senza puntale attivo (nessun cavo in movimento)
          // - activeTool è probes senza pin dell'adattatore attivo (nessun cavo in movimento)
          const isMultimeterIdle = activeTool === 'multimeter' && !activeProbe;
          const isUartIdle = activeTool === 'probes' && !activeAdapterPin;
          const isLensInteractive = activeTool === 'pointer' || isMultimeterIdle || isUartIdle;

          return (
            <div
              className={cn(
                "absolute rounded-full border-4 shadow-lg transition-colors",
                lensIsAnchored ? (isLensInteractive ? "border-green-500 cursor-move" : "border-green-500/50") : "border-blue-500"
              )}
              style={{
                left: lensPosition.x,
                top: lensPosition.y,
                transform: 'translate(-50%, -50%)',
                width: lensRadius * 2,
                height: lensRadius * 2,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: `${containerDims.width * lensZoomLevel}px ${containerDims.height * lensZoomLevel}px`,
                backgroundPosition: `-${lensPosition.x * lensZoomLevel - lensRadius}px -${lensPosition.y * lensZoomLevel - lensRadius}px`,
                backgroundRepeat: 'no-repeat',
                pointerEvents: lensIsAnchored && isLensInteractive ? 'auto' : 'none',
              }}
              onMouseDown={(e) => {
                if (lensIsAnchored && isLensInteractive) {
                  e.stopPropagation();
                  setIsDraggingLens(true);
                }
              }}
            />
          );
        })()}
      </div>

      <div className="absolute inset-0">
        {/* Overlay componenti trovati: sempre visibili con bordo verde */}
        {exerciseData.components.map((component) => {
          if (!foundComponents.includes(component.id)) return null;
          const [left, top, width, height] = component.coords;
          return (
            <div
              key={`found-${component.id}`}
              className="absolute border-2 border-green-500 bg-green-500/20 rounded-md pointer-events-none"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            />
          );
        })}
        {/* Pallini e controlli multimetro */}
        {activeTool === 'multimeter' && (
          <>
            {probe1Percent && (
              <div className="group absolute z-20" style={{ left: `${probe1Percent.x}%`, top: `${probe1Percent.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white/50 shadow-md"/>
                <div className="absolute -inset-2 pointer-events-auto cursor-pointer" onClick={(e) => {e.stopPropagation(); unhookProbe('first');}}><XCircle size={16} className="text-white bg-red-600 rounded-full absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"/></div>
              </div>
            )}
            {probe2Percent && (
              <div className="group absolute z-20" style={{ left: `${probe2Percent.x}%`, top: `${probe2Percent.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-6 h-6 bg-black rounded-full border-2 border-white/50 shadow-md"/>
                <div className="absolute -inset-2 pointer-events-auto cursor-pointer" onClick={(e) => {e.stopPropagation(); unhookProbe('second');}}><XCircle size={16} className="text-white bg-gray-700 rounded-full absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"/></div>
              </div>
            )}
            {activeProbe && snapTargetPercent && (
              <div className="absolute pointer-events-none z-20" style={{ left: `${snapTargetPercent.x}%`, top: `${snapTargetPercent.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className={cn("w-6 h-6 rounded-full border-2 bg-white/20 animate-probe-pulse", activeProbe === 'first' ? 'border-red-500' : 'border-black')} />
              </div>
            )}
          </>
        )}
        {/* Overlay UART: mostra solo pallini di connessione, NO box pin */}
        {showUartOverlay && (
          <>
            {/* Pallini di connessione sui pin PCB */}
            {uartConnections.filter(c => c.pcbPinId).map(conn => {
              const pinPercent = getPinCenterPercent(conn.pcbPinId);
              if (!pinPercent) return null;
              return (
                <div key={conn.adapterPin} className="group absolute z-20" style={{ left: `${pinPercent.x}%`, top: `${pinPercent.y}%`, transform: 'translate(-50%, -50%)' }}>
                  <div className="w-5 h-5 rounded-full border-2 border-white/50 shadow-md" style={{ backgroundColor: WIRE_COLORS[conn.adapterPin] }} />
                  {activeTool === 'probes' && (
                    <div className="absolute -inset-2 pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); unhookUartProbe(conn.adapterPin); }}>
                      <XCircle size={14} className="text-white bg-red-600 rounded-full absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              );
            })}
            {/* Cursore attivo durante il drag (solo in modalità probes) */}
            {activeTool === 'probes' && activeAdapterPin && uartSnapTargetPercent && (
              <div className="absolute pointer-events-none z-20" style={{ left: `${uartSnapTargetPercent.x}%`, top: `${uartSnapTargetPercent.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-5 h-5 rounded-full border-2 bg-white/20 animate-probe-pulse" style={{ borderColor: WIRE_COLORS[activeAdapterPin] }} />
              </div>
            )}
          </>
        )}
        {/* Hotspot componenti: invisibili, solo click handler */}
        {activeTool === 'pointer' && exerciseData.components.map((component) => {
          const [left, top, width, height] = component.coords;
          return <div key={component.id} onClick={(e) => { e.stopPropagation(); selectComponent(component.id); }} className="absolute pointer-events-auto cursor-pointer rounded-md" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`}}/>
        })}
      </div>
    </div>
  );
};

export default PCBViewer;