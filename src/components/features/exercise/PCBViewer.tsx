// src/components/features/exercise/PCBViewer.tsx
'use client';

import { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react';
import { getAllPins, getPinCoords } from '@/data/exercise';
import { useExerciseStore } from '@/store/exerciseStore';
import { cn } from '@/lib/utils';
import { XCircle } from 'lucide-react';
import Multimeter from './Multimeter';
import UartProbesAdapter, { WIRE_COLORS } from './UartProbesAdapter';
import FirmwareDumper, { SPI_WIRE_COLORS } from './FirmwareDumper';
import LensContentLayer from './LensContentLayer';
import type { AdapterPin } from '@/store/exerciseStore';

const SNAP_RADIUS = 15;

const PCBViewer = () => {
  const {
    exerciseData,
    currentStepIndex,
    currentObjectiveIndex,
    stepMode,
    selectComponent,
    foundComponents,
    activeTool, activeTools, mousePosition, updateMousePosition,
    activeProbe, probe1, probe2, snapTarget,
    setSnapTarget, hookProbe, unhookProbe,
    uartConnections, activeAdapterPin, uartSnapTarget,
    setUartSnapTarget, hookUartProbe, unhookUartProbe, uartConnected,
    firmwareDumpConnections, activeFirmwareProbeId, firmwareDumpSnapTarget,
    setFirmwareDumpSnapTarget, hookFirmwareProbe, unhookFirmwareProbe,
    lensRadius, lensZoomLevel, lensVisible, lensIsAnchored, lensAnchorPosition,
    toggleLensAnchor, setLensAnchorPosition,
    isSimulatorEnabled,
  } = useExerciseStore();

  const pcbContainerRef = useRef<HTMLDivElement>(null);
  const pcbImageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const [multimeterPosition, setMultimeterPosition] = useState<{ x: number; y: number } | null>(null);
  const [adapterPosition, setAdapterPosition] = useState<{ x: number; y: number } | null>(null);
  const [dumperPosition, setDumperPosition] = useState<{ x: number; y: number } | null>(null);
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const [isDraggingLens, setIsDraggingLens] = useState(false);

  useLayoutEffect(() => {
    const updateDimensionsAndBounds = () => {
      if (pcbContainerRef.current && pcbImageRef.current) {
        // Usa le dimensioni EFFETTIVE dell'immagine renderizzata
        const imgRect = pcbImageRef.current.getBoundingClientRect();
        const containerRect = pcbContainerRef.current.getBoundingClientRect();

        console.log('📺 [PCBViewer] Dimensioni aggiornate:', {
          immagine: { width: imgRect.width, height: imgRect.height },
          container: { width: containerRect.width, height: containerRect.height },
          offset: {
            left: imgRect.left - containerRect.left,
            top: imgRect.top - containerRect.top
          },
          naturalSize: {
            width: pcbImageRef.current.naturalWidth,
            height: pcbImageRef.current.naturalHeight
          }
        });

        setContainerDims({
          width: imgRect.width,
          height: imgRect.height,
        });
        setBounds(imgRect);
      }
    };
    if (exerciseData?.pcbImage) {
      setImageUrl(window.location.origin + exerciseData.pcbImage);
    }

    // Aggiorna quando l'immagine è caricata
    const img = pcbImageRef.current;
    if (img) {
      if (img.complete) {
        updateDimensionsAndBounds();
      } else {
        img.addEventListener('load', updateDimensionsAndBounds);
      }
    }

    window.addEventListener('resize', updateDimensionsAndBounds);
    return () => {
      window.removeEventListener('resize', updateDimensionsAndBounds);
      if (img) {
        img.removeEventListener('load', updateDimensionsAndBounds);
      }
    };
  }, [exerciseData]);

  useEffect(() => {
    if (!isDraggingLens) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (pcbImageRef.current) {
        const rect = pcbImageRef.current.getBoundingClientRect();
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
    if (activeTool === 'firmware-dump' && firmwareDumpSnapTarget) hookFirmwareProbe();

    // Permetti ancoraggio lente se:
    // - pointer è attivo (sempre)
    // - multimetro attivo con entrambi i puntali agganciati
    // - probes attivo con tutte e 3 le connessioni fatte
    const isMultimeterComplete = activeTools.includes('multimeter') && probe1.hookedTo && probe2.hookedTo;
    const isUartComplete = activeTools.includes('probes') && uartConnections.every(c => c.pcbPinId !== null);
    const isFirmwareDumpComplete = activeTools.includes('firmware-dump') && firmwareDumpConnections.every(c => c.pinId !== null);
    const canAnchorLens = activeTools.includes('pointer') || isMultimeterComplete || isUartComplete || isFirmwareDumpComplete;

    if (lensVisible && canAnchorLens && mousePosition && !isDraggingLens && !lensIsAnchored) {
      toggleLensAnchor();
    }
  };

  // Snap detection: cerca il pin più vicino in base al filter specificato
  const findClosestPin = (mouseX: number, mouseY: number, filterType: 'all' | 'uart-only' | 'firmware-dump-only' = 'all'): string | null => {
    if (!pcbImageRef.current || !exerciseData) return null;

    let closestPin: string | null = null;
    let minDistance = Infinity;
    const pinsToCheck = filterType === 'uart-only'
      ? getAllPins(exerciseData).filter(pin => pin.isUart)
      : filterType === 'firmware-dump-only'
      ? getAllPins(exerciseData).filter(pin => pin.isFirmwareDump)
      : getAllPins(exerciseData);

    // ⚠️ CRITICO: Usa l'immagine, non il container!
    const imgRect = pcbImageRef.current.getBoundingClientRect();

    pinsToCheck.forEach(pin => {
      const [left, top, width, height] = pin.coords;
      const pinX = (left + width / 2) * imgRect.width / 100;
      const pinY = (top + height / 2) * imgRect.height / 100;
      // Snap radius = max of the fixed minimum and half the pin's rendered diameter.
      // This ensures larger pins are proportionally easier to interact with.
      const pinRadiusPx = Math.max(SNAP_RADIUS, (width / 100) * imgRect.width / 2);
      const distance = Math.sqrt(Math.pow(mouseX - pinX, 2) + Math.pow(mouseY - pinY, 2));
      if (distance < pinRadiusPx && distance < minDistance) {
        minDistance = distance;
        closestPin = pin.id;
      }
    });
    return closestPin;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pcbContainerRef.current || !pcbImageRef.current) return;
    const containerRect = pcbContainerRef.current.getBoundingClientRect();
    const imgRect = pcbImageRef.current.getBoundingClientRect();

    // Mouse position relativa all'immagine (non al container)
    const mouseX = e.clientX - imgRect.left;
    const mouseY = e.clientY - imgRect.top;

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
    if (activeTool === 'firmware-dump' && activeFirmwareProbeId) {
      updateMousePosition({ x: mouseX, y: mouseY });
      const closest = findClosestPin(mouseX, mouseY, 'all');
      if (firmwareDumpSnapTarget !== closest) setFirmwareDumpSnapTarget(closest);
    } else if (activeTool === 'firmware-dump' && firmwareDumpSnapTarget) {
      setFirmwareDumpSnapTarget(null);
    }

  };

  const handleMouseLeave = () => {
    updateMousePosition(null);
    setSnapTarget(null);
    setUartSnapTarget(null);
    setFirmwareDumpSnapTarget(null);
  };
  
  // Posizione percentuale del centro di qualsiasi pin (measurement o UART)
  const getPinCenterPercent = (pinId: string | null): { x: number; y: number } | null => {
    if (!pinId || !exerciseData) return null;
    const coords = getPinCoords(pinId, exerciseData);
    if (!coords) return null;
    const [left, top, width, height] = coords;
    return { x: left + width / 2, y: top + height / 2 };
  };

  // Posizione pixel di qualsiasi pin (measurement o UART)
  const getPinPosition = (pinId: string | null) => {
    if (!pinId) return null;
    const centerPercent = getPinCenterPercent(pinId);
    if (!centerPercent) return null;

    // Usa containerDims per consistenza con backgroundSize della lente
    return {
      x: centerPercent.x * containerDims.width / 100,
      y: centerPercent.y * containerDims.height / 100
    };
  };
  
  const probe1Percent = getPinCenterPercent(probe1.hookedTo);
  const probe2Percent = getPinCenterPercent(probe2.hookedTo);
  const snapTargetPercent = snapTarget ? getPinCenterPercent(snapTarget) : null;

  // Per i cavi SVG servono posizioni in pixel
  const probe1Pos = getPinPosition(probe1.hookedTo);
  const probe2Pos = getPinPosition(probe2.hookedTo);

  // Posizione della probe attiva: usa snap target se disponibile, altrimenti mouse
  let activeProbePos = mousePosition;
  if (snapTarget && activeProbe) {
    const snapPos = getPinPosition(snapTarget);
    if (snapPos) activeProbePos = snapPos;
  }
  // Fallback: se mouse non disponibile ma probe attiva, usa posizione multimetro
  if (!activeProbePos && activeProbe && multimeterPosition) {
    const offsetX = activeProbe === 'first' ? 30 : 220;
    const offsetY = 120;
    activeProbePos = { x: multimeterPosition.x + offsetX, y: multimeterPosition.y + offsetY };
  }

  const getWireOrigin = (probeNumber: 'first' | 'second') => {
    if (!multimeterPosition) return null;
    const offsetX = probeNumber === 'first' ? 30 : 220;
    const offsetY = 120;
    return { x: multimeterPosition.x + offsetX, y: multimeterPosition.y + offsetY };
  };

  const wireOrigin1 = getWireOrigin('first');
  const wireOrigin2 = getWireOrigin('second');

  // Funzione helper per generare path curve (esportata per LensContentLayer)
  const getCurvePath = (start: {x: number, y: number} | null, end: {x: number, y: number} | null) => {
    if (!start || !end) return "";
    const cx = (start.x + end.x) / 2;
    const cy = Math.max(start.y, end.y) + 60;
    return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
  };

  // Funzione helper per ottenere l'origine dei cavi UART (esportata per LensContentLayer)
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
  const firmwareDumpSnapTargetPercent = firmwareDumpSnapTarget ? getPinCenterPercent(firmwareDumpSnapTarget) : null;

  // Firmware dump wire origin helper
  const getFirmwareDumpWireOrigin = (probeId: string) => {
    if (!dumperPosition || !exerciseData?.toolConfig?.firmwareDump?.probes) return null;
    const probes = exerciseData.toolConfig.firmwareDump.probes;
    const idx = probes.findIndex(p => p.id === probeId);
    if (idx < 0) return null;
    const cols = 3;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      x: dumperPosition.x + 53 + col * 88,
      y: dumperPosition.y + 72 + row * 62,
    };
  };

  // Firmware dump overlay visibility
  const showFirmwareDumpOverlay = activeTools.includes('firmware-dump');

  // Posizione del cavo firmware dump attivo: usa snap target se disponibile, altrimenti mouse
  let activeFirmwareProbePos = mousePosition;
  if (firmwareDumpSnapTarget && activeFirmwareProbeId) {
    const snapPos = getPinPosition(firmwareDumpSnapTarget);
    if (snapPos) activeFirmwareProbePos = snapPos;
  }
  // Fallback: se mouse non disponibile ma probe attiva, usa posizione dumper
  if (!activeFirmwareProbePos && activeFirmwareProbeId && dumperPosition) {
    const wireOrigin = getFirmwareDumpWireOrigin(activeFirmwareProbeId);
    if (wireOrigin) activeFirmwareProbePos = wireOrigin;
  }

  // Posizione del cavo UART attivo: usa snap target se disponibile, altrimenti mouse
  let activeUartProbePos = mousePosition;
  if (uartSnapTarget && activeAdapterPin) {
    const snapPos = getPinPosition(uartSnapTarget);
    if (snapPos) activeUartProbePos = snapPos;
  }
  // Fallback: se mouse non disponibile ma pin attivo, usa posizione adapter
  if (!activeUartProbePos && activeAdapterPin && adapterPosition) {
    const offsets: Record<AdapterPin, { x: number; y: number }> = {
      'adapter-tx':  { x: 100, y: 150 },
      'adapter-rx':  { x: 160, y: 150 },
      'adapter-gnd': { x: 220, y: 150 },
    };
    const o = offsets[activeAdapterPin];
    activeUartProbePos = { x: adapterPosition.x + o.x, y: adapterPosition.y + o.y };
  }

  // L'overlay UART è visibile:
  // 1. Quando il tool probes è attivo (presente nella sidebar dello step corrente)
  // 2. Quando la configurazione di persistenza lo richiede per lo step corrente
  const uartConfig = exerciseData?.toolConfig?.uartConnector;
  const currentStepForUart = exerciseData?.steps?.[currentStepIndex];
  const currentStepTools = currentStepForUart?.availableTools;
  const probesAvailableInStep = !currentStepTools?.length || currentStepTools.includes('probes');
  const uartPersistVisible = uartConfig?.persistAfterConnection && uartConnected &&
    currentStepForUart && uartConfig.visibleInSteps.includes(currentStepForUart.id);
  const showUartOverlay = (activeTools.includes('probes') && probesAvailableInStep) ||
    !!uartPersistVisible;

  // Posizioni pixel per snap targets (necessarie per LensContentLayer)
  const snapTargetPos = snapTarget ? getPinPosition(snapTarget) : null;
  const uartSnapTargetPos = uartSnapTarget ? getPinPosition(uartSnapTarget) : null;

  // Viewport della lente (memoizzato per performance)
  const lensViewport = useMemo(() => {
    const lensPosition = lensIsAnchored && lensAnchorPosition ? lensAnchorPosition : mousePosition;
    return {
      centerX: lensPosition?.x ?? 0,
      centerY: lensPosition?.y ?? 0,
      radius: lensRadius,
      zoomLevel: lensZoomLevel,
    };
  }, [lensIsAnchored, lensAnchorPosition, mousePosition, lensRadius, lensZoomLevel]);

  // Se exerciseData non è caricato, non renderizzare nulla
  if (!exerciseData || !exerciseData.steps) {
    return null;
  }

  const currentStep = exerciseData.steps[currentStepIndex];
  const currentStepObjectives = currentStep?.objectives || [];

  return (
    <div
      ref={pcbContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleContainerClick}
      className={cn(
        'relative',
        (activeTool === 'multimeter' && activeProbe) ? 'cursor-none' : '',
        (activeTool === 'probes' && activeAdapterPin) ? 'cursor-none' : '',
        (activeTool === 'firmware-dump' && activeFirmwareProbeId) ? 'cursor-none' : '',
      )}
    >
      {/* Wrapper relativo che si adatta esattamente alle dimensioni dell'immagine */}
      <div className="relative inline-block w-full">
        <img ref={pcbImageRef} src={exerciseData.pcbImage} alt="PCB View" className="h-auto w-full block rounded-lg" style={{ imageRendering: 'crisp-edges' }} draggable={false} />
        {isSimulatorEnabled && activeTools.includes('multimeter') && <Multimeter onPositionChange={setMultimeterPosition} bounds={bounds} />}
        {isSimulatorEnabled && showUartOverlay && <UartProbesAdapter onPositionChange={setAdapterPosition} bounds={bounds} readOnly={activeTool !== 'probes'} />}
        {isSimulatorEnabled && showFirmwareDumpOverlay && <FirmwareDumper onPositionChange={setDumperPosition} bounds={bounds} />}

      <div className="absolute inset-0 pointer-events-none z-10">
        {isSimulatorEnabled && activeTools.includes('multimeter') && (
            <svg width="100%" height="100%" className="absolute inset-0" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' }}>
              <defs><filter id="shadow"><feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.4)"/></filter></defs>

              {/* === LOGICA DI RENDERING DEI CAVI CORRETTA E SEMPLIFICATA === */}

              {/* Se il puntale 1 è attivo, disegna il suo cavo che segue il mouse */}
              {activeProbe === 'first' && (
                <path d={getCurvePath(wireOrigin1, activeProbePos)} stroke="#EF4444" strokeWidth="4" fill="none" strokeDasharray="8,4" opacity="0.7" />
              )}
              {/* Altrimenti, se è agganciato, disegna il cavo fisso */}
              {probe1Pos && activeProbe !== 'first' && (
                <path d={getCurvePath(wireOrigin1, probe1Pos)} stroke="#EF4444" strokeWidth="4" fill="none" />
              )}

              {/* Se il puntale 2 è attivo, disegna il suo cavo che segue il mouse */}
              {activeProbe === 'second' && (
                <path d={getCurvePath(wireOrigin2, activeProbePos)} stroke="black" strokeWidth="4" fill="none" strokeDasharray="8,4" opacity="0.7" />
              )}
              {/* Altrimenti, se è agganciato, disegna il cavo fisso */}
              {probe2Pos && activeProbe !== 'second' && (
                <path d={getCurvePath(wireOrigin2, probe2Pos)} stroke="black" strokeWidth="4" fill="none" />
              )}

            </svg>
        )}
        {isSimulatorEnabled && showUartOverlay && (
          <svg width="100%" height="100%" className="absolute inset-0" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' }}>
            {uartConnections.map(conn => {
              const wireOrigin = getUartWireOrigin(conn.adapterPin);
              const color = WIRE_COLORS[conn.adapterPin];

              if (conn.adapterPin === activeAdapterPin) {
                const endPos = uartSnapTarget ? getPinPosition(uartSnapTarget) : mousePosition;
                return <path key={conn.adapterPin} d={getCurvePath(wireOrigin, endPos)} stroke={color} strokeWidth="4" fill="none" strokeDasharray="8,4" opacity="0.7" />;
              }
              if (conn.pcbPinId) {
                const pinPos = getPinPosition(conn.pcbPinId);
                return <path key={conn.adapterPin} d={getCurvePath(wireOrigin, pinPos)} stroke={color} strokeWidth="4" fill="none" />;
              }
              return null;
            })}
          </svg>
        )}
        {isSimulatorEnabled && showFirmwareDumpOverlay && (
          <svg width="100%" height="100%" className="absolute inset-0" style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' }}>
            {firmwareDumpConnections.map(conn => {
              const wireOrigin = getFirmwareDumpWireOrigin(conn.probeId);
              const probe = exerciseData?.toolConfig?.firmwareDump?.probes.find(p => p.id === conn.probeId);
              const color = probe ? (SPI_WIRE_COLORS[probe.role] || probe.color) : '#888';

              if (conn.probeId === activeFirmwareProbeId) {
                const endPos = firmwareDumpSnapTarget ? getPinPosition(firmwareDumpSnapTarget) : mousePosition;
                return <path key={conn.probeId} d={getCurvePath(wireOrigin, endPos)} stroke={color} strokeWidth="4" fill="none" strokeDasharray="8,4" opacity="0.7" />;
              }
              if (conn.pinId) {
                const pinPos = getPinPosition(conn.pinId);
                return <path key={conn.probeId} d={getCurvePath(wireOrigin, pinPos)} stroke={color} strokeWidth="4" fill="none" />;
              }
              return null;
            })}
          </svg>
        )}
      </div>

      {/* Layer z-25: Lente d'ingrandimento con contenuto zoomato */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }}>
        {lensVisible && imageUrl && containerDims.width > 0 && (() => {
          const lensPosition = lensIsAnchored && lensAnchorPosition ? lensAnchorPosition : mousePosition;
          if (!lensPosition) return null;

          // La lente NON è interattiva quando una sonda è attiva (per evitare conflitti di cursore)
          const isProbeActive = !!(activeProbe || activeAdapterPin || activeFirmwareProbeId);
          const isLensInteractive = !isProbeActive;

          return (
            <div
              id="magnifier-lens"
              className={cn(
                "absolute rounded-full overflow-hidden transition-shadow",
                lensIsAnchored && isLensInteractive ? "cursor-move" : ""
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
                boxShadow: lensIsAnchored
                  ? (isLensInteractive
                      ? '0 0 0 4px rgb(34 197 94), 0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      : '0 0 0 4px rgb(34 197 94 / 0.5), 0 10px 15px -3px rgb(0 0 0 / 0.1)')
                  : '0 0 0 4px rgb(59 130 246), 0 10px 15px -3px rgb(0 0 0 / 0.1)',
                pointerEvents: lensIsAnchored && isLensInteractive ? 'auto' : 'none',
              }}
              onMouseDown={(e) => {
                if (lensIsAnchored && isLensInteractive) {
                  e.stopPropagation();
                  setIsDraggingLens(true);
                }
              }}
            >
              {/* Renderizza cavi e pallini ingranditi dentro la lente */}
              <LensContentLayer
                lensViewport={lensViewport}
                containerDims={containerDims}
                activeTool={activeTool}
                activeTools={activeTools}
                showUartOverlay={showUartOverlay}
                showFirmwareDumpOverlay={showFirmwareDumpOverlay}
                probe1Pos={probe1Pos}
                probe2Pos={probe2Pos}
                activeProbePos={activeProbePos}
                wireOrigin1={wireOrigin1}
                wireOrigin2={wireOrigin2}
                activeProbe={activeProbe}
                snapTargetPos={snapTargetPos}
                uartConnections={uartConnections}
                activeAdapterPin={activeAdapterPin}
                activeUartProbePos={activeUartProbePos}
                adapterPosition={adapterPosition}
                uartSnapTargetPos={uartSnapTargetPos}
                firmwareDumpConnections={firmwareDumpConnections}
                activeFirmwareProbeId={activeFirmwareProbeId}
                activeFirmwareProbePos={activeFirmwareProbePos}
                firmwareDumpSnapTargetPos={firmwareDumpSnapTarget ? getPinPosition(firmwareDumpSnapTarget) : null}
                dumperPosition={dumperPosition}
                firmwareDumpProbes={exerciseData?.toolConfig?.firmwareDump?.probes}
                getFirmwareDumpWireOrigin={getFirmwareDumpWireOrigin}
                getCurvePath={getCurvePath}
                getUartWireOrigin={getUartWireOrigin}
                getPinPosition={getPinPosition}
              />
            </div>
          );
        })()}
      </div>

      <div className="absolute inset-0">
        {/* Overlay componenti trovati: animazione fade-out dopo il ritrovamento */}
        {currentStepObjectives.map((objective) => {
          if (!foundComponents.includes(objective.id)) return null;
          return (
            <FoundComponentOverlay
              key={`found-${objective.id}`}
              objectiveId={objective.id}
              coords={objective.coords}
            />
          );
        })}
        {/* Pallini e controlli multimetro */}
        {isSimulatorEnabled && activeTools.includes('multimeter') && (
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
        {isSimulatorEnabled && showUartOverlay && (
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
        {/* Firmware dump pin dots */}
        {isSimulatorEnabled && showFirmwareDumpOverlay && (
          <>
            {firmwareDumpConnections.filter(c => c.pinId).map(conn => {
              const pinPercent = getPinCenterPercent(conn.pinId);
              if (!pinPercent) return null;
              const probe = exerciseData?.toolConfig?.firmwareDump?.probes.find(p => p.id === conn.probeId);
              const color = probe ? (SPI_WIRE_COLORS[probe.role] || probe.color) : '#888';
              return (
                <div key={conn.probeId} className="group absolute z-20" style={{ left: `${pinPercent.x}%`, top: `${pinPercent.y}%`, transform: 'translate(-50%, -50%)' }}>
                  <div className="w-5 h-5 rounded-full border-2 border-white/50 shadow-md" style={{ backgroundColor: color }} />
                  {activeTool === 'firmware-dump' && (
                    <div className="absolute -inset-2 pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); unhookFirmwareProbe(conn.probeId); }}>
                      <XCircle size={14} className="text-white bg-red-600 rounded-full absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              );
            })}
            {activeTool === 'firmware-dump' && activeFirmwareProbeId && firmwareDumpSnapTargetPercent && (
              <div className="absolute pointer-events-none z-20" style={{ left: `${firmwareDumpSnapTargetPercent.x}%`, top: `${firmwareDumpSnapTargetPercent.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-5 h-5 rounded-full border-2 bg-white/20 animate-probe-pulse" style={{ borderColor: SPI_WIRE_COLORS[exerciseData?.toolConfig?.firmwareDump?.probes.find(p => p.id === activeFirmwareProbeId)?.role ?? 'cs'] ?? '#A855F7' }} />
              </div>
            )}
          </>
        )}
        {/* Hotspot componenti: invisibili, solo click handler - mostra solo gli obiettivi dello step corrente */}
        {activeTools.includes('pointer') && stepMode === 'active' && currentStepObjectives.map((objective) => {
          const [left, top, width, height] = objective.coords;
          return <div key={objective.id} onClick={(e) => { e.stopPropagation(); selectComponent(objective.id); }} className="absolute pointer-events-auto cursor-pointer rounded-md" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`}}/>
        })}
      </div>
      {/* Chiusura wrapper relativo all'immagine */}
      </div>
    </div>
  );
};

/** Overlay that flashes green then fades out when a component is found. */
const FADE_DURATION_MS = 2000;

const FoundComponentOverlay = ({
  objectiveId,
  coords,
}: {
  objectiveId: string;
  coords: [number, number, number, number];
}) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fading after a brief flash
    const fadeTimer = setTimeout(() => setFading(true), 400);
    // Remove from DOM after transition
    const removeTimer = setTimeout(() => setVisible(false), 400 + FADE_DURATION_MS);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  if (!visible) return null;

  const [left, top, width, height] = coords;
  return (
    <div
      className="absolute border-2 border-green-500 bg-green-500/20 rounded-md pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
        opacity: fading ? 0 : 1,
      }}
    />
  );
};

export default PCBViewer;