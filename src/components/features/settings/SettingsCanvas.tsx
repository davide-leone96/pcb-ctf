// src/components/features/settings/SettingsCanvas.tsx
'use client';

import { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import ComponentPopup from './ComponentPopup';
import ObjectivePopup from './ObjectivePopup';
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
    activeTool, components, activeComponentId,
    steps, pins, dragState, activeStepId, activeObjectiveId, activePinId, pendingPinCoords,
    pcbImagePath,
    startDrag, updateDrag, endDrag,
    placePin, movePinCoords,
    editComponent, editObjective, editPin, selectStep,
  } = useSettingsStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  // All component-type objectives across all steps (with step reference)
  const allComponentObjectives = useMemo(() =>
    steps.flatMap(step =>
      step.objectives
        .filter(o => o.type === 'component' && o.coords[2] > 0 && o.coords[3] > 0)
        .map(o => ({ ...o, stepId: step.id }))
    ),
    [steps],
  );

  // Active objective for popup
  const activeObjective = useMemo(() => {
    if (!activeObjectiveId) return null;
    for (const step of steps) {
      const obj = step.objectives.find(o => o.id === activeObjectiveId);
      if (obj) return obj;
    }
    return null;
  }, [steps, activeObjectiveId]);

  const activeComponent = activeComponentId ? components.find(c => c.id === activeComponentId) : null;
  const activePin = activePinId ? pins.find(p => p.id === activePinId) : null;

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current && containerRef.current) {
        const imgRect = imageRef.current.getBoundingClientRect();
        setContainerDims({ width: imgRect.width, height: imgRect.height });
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
      if (img) img.removeEventListener('load', updateDimensions);
    };
  }, []);

  // --- Drag handling for component and objective tools ---
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
    if ((e.target as HTMLElement).closest('[data-popup]')) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

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
        movePinCoords(x, y);
      } else {
        placePin(x, y);
      }
    }
  };

  const getDragRect = () => {
    if (!dragState) return null;
    const left = Math.min(dragState.startX, dragState.currentX);
    const top = Math.min(dragState.startY, dragState.currentY);
    const width = Math.abs(dragState.currentX - dragState.startX);
    const height = Math.abs(dragState.currentY - dragState.startY);
    return { left, top, width, height };
  };

  const dragRect = getDragRect();
  const canDrag = activeTool === 'component';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        'relative select-none',
        canDrag ? 'cursor-crosshair' : '',
        activeTool === 'pin' ? 'cursor-crosshair' : '',
      )}
    >
      <div className="relative inline-block w-full">
        <img
          ref={imageRef}
          src={pcbImagePath}
          alt="PCB Image"
          className="h-auto w-full block rounded-lg"
          draggable={false}
        />

        {/* Overlay: Init components (green border) */}
        <div className="absolute inset-0 pointer-events-none">
          {components.filter(c => c.coords[2] > 0 && c.coords[3] > 0).map(comp => {
            const [left, top, width, height] = comp.coords;
            const isActive = comp.id === activeComponentId;
            return (
              <div
                key={comp.id}
                className={cn(
                  'absolute border-2 rounded-sm transition-colors pointer-events-auto cursor-pointer',
                  isActive
                    ? 'border-green-400 bg-green-500/30 ring-1 ring-green-400/50'
                    : 'border-green-400/60 bg-green-500/15 hover:bg-green-500/25',
                )}
                style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                onClick={(e) => { e.stopPropagation(); editComponent(comp.id); }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {comp.name && (
                  <span className="absolute -top-5 left-0 text-xs text-green-300 whitespace-nowrap bg-black/70 px-1 rounded select-none">
                    {comp.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Overlay: component-type objectives from ALL steps (blue border) */}
        <div className="absolute inset-0 pointer-events-none">
          {allComponentObjectives.map(obj => {
            const [left, top, width, height] = obj.coords;
            const isActiveStep = obj.stepId === activeStepId;
            const isActiveObj = obj.id === activeObjectiveId;
            return (
              <div
                key={obj.id}
                className={cn(
                  'absolute border-2 rounded-sm transition-colors pointer-events-auto cursor-pointer',
                  isActiveObj
                    ? 'border-blue-400 bg-blue-500/30 ring-1 ring-blue-400/50'
                    : isActiveStep
                      ? 'border-blue-400/60 bg-blue-500/15 hover:bg-blue-500/25'
                      : 'border-gray-500/40 bg-gray-500/10 hover:bg-gray-500/20',
                )}
                style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isActiveStep) selectStep(obj.stepId);
                  editObjective(obj.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {obj.name && (
                  <span
                    className={cn(
                      'absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded select-none',
                      isActiveStep ? 'text-blue-300 bg-black/70' : 'text-gray-400 bg-black/50',
                    )}
                  >
                    {obj.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Overlay: pins */}
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

        {/* Component popup (Init) */}
        {activeComponent && containerDims.width > 0 && (
          <div data-popup>
            <ComponentPopup component={activeComponent} containerDims={containerDims} />
          </div>
        )}

        {/* Objective popup (Challenge) */}
        {activeObjective && containerDims.width > 0 && (
          <div data-popup>
            <ObjectivePopup objective={activeObjective} containerDims={containerDims} />
          </div>
        )}

        {/* Pin popup */}
        {activePin && containerDims.width > 0 && (
          <div data-popup>
            <PinPopup pin={activePin} containerDims={containerDims} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsCanvas;
