// src/components/features/settings/SettingsCanvas.tsx
'use client';

import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import ComponentPopup from './ComponentPopup';
import PinPopup from './PinPopup';

const PIN_TYPE_COLORS: Record<string, string> = {
  custom: '#22D3EE', // cyan
  tx: '#22C55E',     // green
  rx: '#FACC15',     // yellow
  gnd: '#6B7280',    // gray
  vcc: '#EF4444',    // red
};

const SettingsCanvas = () => {
  const {
    activeTool, components, pins, dragState, activeComponentId, activePinId, pendingPinCoords,
    pcbImagePath,
    startDrag, updateDrag, endDrag,
    placePin, movePinCoords,
    editComponent, editPin,
  } = useSettingsStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current && containerRef.current) {
        // Usa le dimensioni EFFETTIVE dell'immagine renderizzata
        const imgRect = imageRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        console.log('🔧 [SettingsCanvas] Dimensioni aggiornate:', {
          immagine: { width: imgRect.width, height: imgRect.height },
          container: { width: containerRect.width, height: containerRect.height },
          offset: {
            left: imgRect.left - containerRect.left,
            top: imgRect.top - containerRect.top
          },
          naturalSize: {
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight
          }
        });

        setContainerDims({
          width: imgRect.width,
          height: imgRect.height,
        });
      }
    };

    const img = imageRef.current;
    if (img) {
      if (img.complete) {
        updateDimensions();
      } else {
        img.addEventListener('load', updateDimensions);
      }
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (img) {
        img.removeEventListener('load', updateDimensions);
      }
    };
  }, []);

  // --- Drag handling for component tool ---
  const isDragging = useRef(false);

  useEffect(() => {
    if (activeTool !== 'component') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      updateDrag(
        Math.max(0, Math.min(100, x)),
        Math.max(0, Math.min(100, y)),
      );
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTool, updateDrag, endDrag]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    // Don't start interactions if clicking on a popup
    if ((e.target as HTMLElement).closest('[data-popup]')) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    console.log('🖱️ [SettingsCanvas] MouseDown:', {
      clientPos: `(${e.clientX}, ${e.clientY})`,
      imgRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      relativePos: `(${(e.clientX - rect.left).toFixed(0)}px, ${(e.clientY - rect.top).toFixed(0)}px)`,
      percentPos: `(${x.toFixed(2)}%, ${y.toFixed(2)}%)`,
      tool: activeTool
    });

    if (activeTool === 'component') {
      isDragging.current = true;
      startDrag(x, y);
      e.preventDefault();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    if ((e.target as HTMLElement).closest('[data-popup]')) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'pin') {
      if (activePinId && pendingPinCoords) {
        // Popup is open: move pin to new location
        movePinCoords(x, y);
      } else {
        // No popup: place new pin
        placePin(x, y);
      }
    }
  };

  // Get the active drag rectangle in percentages
  const getDragRect = () => {
    if (!dragState) return null;
    const left = Math.min(dragState.startX, dragState.currentX);
    const top = Math.min(dragState.startY, dragState.currentY);
    const width = Math.abs(dragState.currentX - dragState.startX);
    const height = Math.abs(dragState.currentY - dragState.startY);
    return { left, top, width, height };
  };

  const dragRect = getDragRect();
  const activeComponent = activeComponentId ? components.find(c => c.id === activeComponentId) : null;
  const activePin = activePinId ? pins.find(p => p.id === activePinId) : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        'relative select-none',
        activeTool === 'component' ? 'cursor-crosshair' : '',
        activeTool === 'pin' ? 'cursor-crosshair' : '',
      )}
    >
      {/* Wrapper relativo che si adatta esattamente alle dimensioni dell'immagine */}
      <div className="relative inline-block w-full">
        <img
          ref={imageRef}
          src={pcbImagePath}
          alt="PCB Image"
          className="h-auto w-full block rounded-lg"
          draggable={false}
        />

        {/* Overlay layer for saved components */}
        <div className="absolute inset-0 pointer-events-none">
        {components.map(comp => {
          const [left, top, width, height] = comp.coords;
          const isActive = comp.id === activeComponentId;
          return (
            <div
              key={comp.id}
              className={cn(
                'absolute border-2 rounded-sm transition-colors pointer-events-auto cursor-pointer',
                isActive ? 'border-blue-400 bg-blue-500/30' : 'border-blue-400/60 bg-blue-500/15 hover:bg-blue-500/25'
              )}
              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              onClick={(e) => { e.stopPropagation(); editComponent(comp.id); }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {comp.name && (
                <span className="absolute -top-5 left-0 text-xs text-blue-300 whitespace-nowrap bg-black/70 px-1 rounded select-none">
                  {comp.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay layer for saved pins */}
      <div className="absolute inset-0 pointer-events-none">
        {pins.map(pin => {
          const isActive = pin.id === activePinId;
          const color = PIN_TYPE_COLORS[pin.pinType] || PIN_TYPE_COLORS.custom;
          const sizePx = (pin.size / 100) * containerDims.width;
          const leftPx = (pin.coords[0] / 100) * containerDims.width - sizePx / 2;
          const topPx = (pin.coords[1] / 100) * containerDims.height - sizePx / 2;

          return (
            <div
              key={pin.id}
              className={cn(
                'absolute border-2 transition-colors pointer-events-auto cursor-pointer',
                pin.shape === 'circle' ? 'rounded-full' : 'rounded-sm',
                isActive ? 'ring-2 ring-white/50' : '',
              )}
              style={{
                left: leftPx,
                top: topPx,
                width: sizePx,
                height: sizePx,
                borderColor: color,
                backgroundColor: `${color}33`,
              }}
              onClick={(e) => { e.stopPropagation(); editPin(pin.id); }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {pin.label && (
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-black/70 px-1 rounded select-none"
                  style={{ color }}
                >
                  {pin.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Active drag rectangle */}
      {dragRect && (
        <div
          className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none z-20"
          style={{
            left: `${dragRect.left}%`,
            top: `${dragRect.top}%`,
            width: `${dragRect.width}%`,
            height: `${dragRect.height}%`,
          }}
        />
      )}

      {/* Pending pin marker (pulsing) */}
      {activePinId && pendingPinCoords && !activePin?.label && (
        <div
          className={cn(
            'absolute border-2 border-cyan-400 bg-cyan-400/20 animate-pulse pointer-events-none z-20',
            (activePin?.shape ?? 'circle') === 'circle' ? 'rounded-full' : 'rounded-sm',
          )}
          style={{
            left: `${pendingPinCoords[0]}%`,
            top: `${pendingPinCoords[1]}%`,
            width: `${(activePin?.size ?? 2)}%`,
            height: `${(activePin?.size ?? 2)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* Component popup */}
      {activeComponent && containerDims.width > 0 && (
        <div data-popup>
          <ComponentPopup component={activeComponent} containerDims={containerDims} />
        </div>
      )}

      {/* Pin popup */}
      {activePin && containerDims.width > 0 && (
        <div data-popup>
          <PinPopup pin={activePin} containerDims={containerDims} />
        </div>
      )}
      {/* Chiusura wrapper relativo all'immagine */}
      </div>
    </div>
  );
};

export default SettingsCanvas;
