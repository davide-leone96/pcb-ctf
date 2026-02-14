// src/components/features/settings/SettingsCanvas.tsx
'use client';

import { useRef, useState, useLayoutEffect, useEffect, useMemo, useCallback, type ChangeEvent } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import { cn } from '@/lib/utils';
import { Upload, Terminal, TerminalSquare, Braces, Flag, Cpu, FolderTree, Layers, FileCode, Check, AlertTriangle, Pencil, RotateCcw } from 'lucide-react';
import yaml from 'js-yaml';
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
    canvasZoom, canvasRotation, canvasPanX, canvasPanY, canvasPanMode,
    setPan, setCanvasZoom, uploadImage,
  } = useSettingsStore();
  const updateComponentCoords = useSettingsStore(s => s.updateComponentCoords);
  const updatePinCoords = useSettingsStore(s => s.updatePinCoords);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const [isDragOverImage, setIsDragOverImage] = useState(false);

  // Dragging state for components/pins
  const [draggingItem, setDraggingItem] = useState<{ type: 'component' | 'pin'; id: string; startX: number; startY: number; initialCoords: number[] } | null>(null);

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

  // Use getBoundingClientRect for accurate post-transform dimensions
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        setContainerDims({
          width: rect.width,
          height: rect.height,
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
      if (img) img.removeEventListener('load', updateDimensions);
    };
  }, [pcbImagePath]);

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

  // --- Dragging items (components/pins) ---
  useEffect(() => {
    if (!draggingItem || !imageRef.current) return;

    const handleDragMove = (e: MouseEvent) => {
      const rect = imageRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const dx = x - draggingItem.startX;
      const dy = y - draggingItem.startY;

      if (draggingItem.type === 'component') {
        const [left, top, width, height] = draggingItem.initialCoords as [number, number, number, number];
        const newLeft = Math.max(0, Math.min(100 - width, left + dx));
        const newTop = Math.max(0, Math.min(100 - height, top + dy));
        updateComponentCoords(draggingItem.id, [newLeft, newTop, width, height]);
      } else if (draggingItem.type === 'pin') {
        const [px, py] = draggingItem.initialCoords as [number, number];
        const newX = Math.max(0, Math.min(100, px + dx));
        const newY = Math.max(0, Math.min(100, py + dy));
        updatePinCoords(draggingItem.id, [newX, newY]);
      }
    };

    const handleDragEnd = () => {
      setDraggingItem(null);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [draggingItem, updateComponentCoords, updatePinCoords]);

  // --- Middle-click pan ---
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePanMove = (e: MouseEvent) => {
      if (!isPanning.current || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      // Converti il pan da pixel schermo a percentuale dell'immagine
      const dxPercent = (dx / rect.width) * 100;
      const dyPercent = (dy / rect.height) * 100;
      setPan(panOrigin.current.x + dxPercent, panOrigin.current.y + dyPercent);
    };

    const handlePanUp = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 0) {
        isPanning.current = false;
      }
    };

    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanUp);
    return () => {
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanUp);
    };
  }, [setPan]);

  // --- Ctrl+scroll zoom ---
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const store = useSettingsStore.getState();
      store.setCanvasZoom(store.canvasZoom + delta);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle-click pan (always available)
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { x: canvasPanX, y: canvasPanY };
      return;
    }

    // Left-click pan when pan mode is active
    if (e.button === 0 && canvasPanMode) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { x: canvasPanX, y: canvasPanY };
      return;
    }

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
    if (canvasPanMode) return;
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

  // --- Drag-and-drop image upload ---
  const handleFileDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDragOverImage(true);
    }
  };

  const handleFileDragLeave = () => setIsDragOverImage(false);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverImage(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await uploadImage(file);
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
  const hasImage = pcbImagePath !== '';

  // Determine which tab is active
  const isInitTab = activeTool === 'component' || activeTool === 'pin';
  const isTerminalTab = activeTool === 'terminal-config';

  // Terminal tab: show config preview
  if (isTerminalTab) {
    return <TerminalConfigPreview />;
  }

  // Empty state with upload area
  if (!hasImage) {
    return (
      <div
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className={cn(
          'relative min-h-[500px] flex items-center justify-center rounded-lg transition-all',
          isDragOverImage
            ? 'bg-blue-500/10 border-2 border-blue-400 border-dashed'
            : 'bg-gray-800/50 border-2 border-gray-600 border-dashed hover:border-gray-500 hover:bg-gray-800/70',
        )}
      >
        <div className="text-center px-6 py-12">
          <div className={cn(
            'mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all',
            isDragOverImage ? 'bg-blue-500/20 scale-110' : 'bg-gray-700/50',
          )}>
            <Upload className={cn(
              'w-12 h-12 transition-colors',
              isDragOverImage ? 'text-blue-400' : 'text-gray-400',
            )} />
          </div>

          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            {isDragOverImage ? 'Rilascia qui' : 'Nessuna immagine caricata'}
          </h3>

          <p className="text-gray-400 text-sm mb-6 max-w-md">
            {isDragOverImage
              ? 'Rilascia il file per caricarlo'
              : 'Carica un\'immagine PCB per iniziare a configurare componenti, pin e obiettivi'}
          </p>

          {!isDragOverImage && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <div className="text-xs text-gray-500">
                Trascina un'immagine qui oppure usa il pulsante carica nella toolbar
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>Formati supportati:</span>
            <span className="text-gray-400 font-mono">JPEG, PNG, WebP</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
      className={cn(
        'relative select-none overflow-hidden',
        canvasPanMode ? 'cursor-grab active:cursor-grabbing' :
          canDrag ? 'cursor-crosshair' :
            activeTool === 'pin' ? 'cursor-crosshair' : '',
        isDragOverImage && 'ring-2 ring-blue-400 ring-inset',
      )}
    >
      {/* Drop overlay */}
      {isDragOverImage && (
        <div className="absolute inset-0 bg-blue-500/10 z-50 flex items-center justify-center pointer-events-none">
          <span className="text-blue-300 text-sm font-medium bg-black/60 px-3 py-1.5 rounded">
            Rilascia per caricare immagine
          </span>
        </div>
      )}

      {/* Transform wrapper: zoom + rotate + pan */}
      <div
        className="relative inline-block w-full origin-center"
        style={{
          transform: `translate(${canvasPanX}%, ${canvasPanY}%) scale(${canvasZoom}) rotate(${canvasRotation}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <img
          ref={imageRef}
          src={pcbImagePath}
          alt="PCB Image"
          className="h-auto w-full block rounded-lg"
          style={{ imageRendering: 'high-quality' }}
          draggable={false}
        />

        {/* Overlay: Init components (green border) - only in Init tab */}
        {isInitTab && (
          <div className="absolute inset-0 pointer-events-none">
            {components.filter(c => c.coords[2] > 0 && c.coords[3] > 0).map(comp => {
            const [left, top, width, height] = comp.coords;
            const isActive = comp.id === activeComponentId;
            const isDragging = draggingItem?.type === 'component' && draggingItem?.id === comp.id;
            return (
              <div
                key={comp.id}
                className={cn(
                  'absolute border-2 rounded-sm transition-colors pointer-events-auto',
                  isDragging ? 'cursor-grabbing' : 'cursor-move',
                  isActive
                    ? 'border-green-400 bg-green-500/30 ring-1 ring-green-400/50'
                    : 'border-green-400/60 bg-green-500/15 hover:bg-green-500/25',
                )}
                style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                onClick={(e) => {
                  if (!isDragging) {
                    e.stopPropagation();
                    editComponent(comp.id);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (!imageRef.current) return;
                  const rect = imageRef.current.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setDraggingItem({
                    type: 'component',
                    id: comp.id,
                    startX: x,
                    startY: y,
                    initialCoords: [left, top, width, height],
                  });
                }}
                title="Trascina per spostare"
              >
                {comp.name && (
                  <span className="absolute -top-5 left-0 text-xs text-green-300 whitespace-nowrap bg-black/70 px-1 rounded select-none pointer-events-none">
                    {comp.name}
                  </span>
                )}
              </div>
            );
          })}
          </div>
        )}

        {/* Overlay: component-type objectives from ALL steps (blue border) - only in Challenge tab */}
        {!isInitTab && !isTerminalTab && (
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
        )}

        {/* Overlay: pins - only in Init tab */}
        {isInitTab && (
          <div className="absolute inset-0 pointer-events-none">
          {pins.map(pin => {
            const isActive = pin.id === activePinId;
            const isDragging = draggingItem?.type === 'pin' && draggingItem?.id === pin.id;
            const color = PIN_TYPE_COLORS[pin.pinType] || PIN_TYPE_COLORS.custom;
            const sizePx = (pin.size / 100) * containerDims.width;
            const leftPx = (pin.coords[0] / 100) * containerDims.width - sizePx / 2;
            const topPx = (pin.coords[1] / 100) * containerDims.height - sizePx / 2;

            return (
              <div
                key={pin.id}
                className={cn(
                  'absolute border-2 transition-colors pointer-events-auto',
                  isDragging ? 'cursor-grabbing' : 'cursor-move',
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
                onClick={(e) => {
                  if (!isDragging) {
                    e.stopPropagation();
                    editPin(pin.id);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (!imageRef.current) return;
                  const rect = imageRef.current.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setDraggingItem({
                    type: 'pin',
                    id: pin.id,
                    startX: x,
                    startY: y,
                    initialCoords: pin.coords,
                  });
                }}
                title="Trascina per spostare"
              >
                {pin.label && (
                  <span
                    className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-black/70 px-1 rounded select-none pointer-events-none"
                    style={{ color }}
                  >
                    {pin.label}
                  </span>
                )}
              </div>
            );
          })}
          </div>
        )}

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

        {/* Popups - inside transform wrapper, contained within image */}
        {activeComponent && containerDims.width > 0 && (
          <ComponentPopup component={activeComponent} containerDims={containerDims} />
        )}

        {activeObjective && containerDims.width > 0 && (
          <ObjectivePopup objective={activeObjective} containerDims={containerDims} />
        )}

        {activePin && containerDims.width > 0 && (
          <PinPopup pin={activePin} containerDims={containerDims} />
        )}
      </div>
    </div>
  );
};

// ============================================
// TERMINAL CONFIG PREVIEW
// ============================================

const TerminalConfigPreview = () => {
  const { tabs, commands, bootStages, filesystemEntries, flagParts, completeFlag, exportAsTerminalConfig, loadFromTerminalConfig, initialized } = useTerminalSettingsStore();
  const [viewMode, setViewMode] = useState<'summary' | 'json' | 'yaml'>('summary');
  const [editorContent, setEditorContent] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Serialize current config to the given format
  const serializeConfig = useCallback((format: 'json' | 'yaml') => {
    const config = exportAsTerminalConfig();
    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    }
    return yaml.dump(config, { indent: 2, lineWidth: 120, noRefs: true, sortKeys: false });
  }, [exportAsTerminalConfig]);

  // Initialize editor content ONLY when view mode changes to a code view
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    const modeChanged = prevViewModeRef.current !== viewMode;
    prevViewModeRef.current = viewMode;

    if (modeChanged && (viewMode === 'json' || viewMode === 'yaml')) {
      setEditorContent(serializeConfig(viewMode));
      setParseError(null);
      setImportSuccess(false);
      setIsDirty(false);
    }
  }, [viewMode, serializeConfig]);

  // Handle textarea changes
  const handleEditorChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    setParseError(null);
    setImportSuccess(false);
    setIsDirty(true);
  }, []);

  // Parse and import the edited config
  const handleImport = useCallback(() => {
    try {
      let parsed: any;
      if (viewMode === 'json') {
        parsed = JSON.parse(editorContent);
      } else if (viewMode === 'yaml') {
        parsed = yaml.load(editorContent);
      } else {
        return;
      }

      if (!parsed || typeof parsed !== 'object' || !parsed.tabs) {
        setParseError('Configurazione non valida: manca la proprietà "tabs"');
        return;
      }

      loadFromTerminalConfig(parsed);
      setParseError(null);
      setImportSuccess(true);
      setIsDirty(false);
      setTimeout(() => setImportSuccess(false), 2500);
    } catch (err: any) {
      setParseError(err.message || 'Errore di parsing');
    }
  }, [editorContent, viewMode, loadFromTerminalConfig]);

  // Reset editor content to current store state
  const handleReset = useCallback(() => {
    if (viewMode === 'json' || viewMode === 'yaml') {
      setEditorContent(serializeConfig(viewMode));
      setParseError(null);
      setImportSuccess(false);
      setIsDirty(false);
    }
  }, [viewMode, serializeConfig]);

  if (!initialized) {
    return (
      <div className="relative min-h-[500px] flex items-center justify-center rounded-lg bg-gray-800/50 border-2 border-gray-600 border-dashed">
        <div className="text-center px-6 py-12">
          <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-gray-700/50">
            <TerminalSquare className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">Configurazione terminale</h3>
          <p className="text-gray-400 text-sm">
            La configurazione verr&agrave; caricata automaticamente.
          </p>
        </div>
      </div>
    );
  }

  const dirs = filesystemEntries.filter(e => e.type === 'directory');
  const files = filesystemEntries.filter(e => e.type === 'file');
  const isCodeView = viewMode === 'json' || viewMode === 'yaml';

  return (
    <div className="relative min-h-[500px] flex flex-col rounded-lg bg-gray-900/80 border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-white">Terminal Config Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(viewMode === 'json' ? 'summary' : 'json')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              viewMode === 'json' ? 'bg-green-600/50 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
            )}
          >
            <Braces className="h-3 w-3" />
            JSON
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'yaml' ? 'summary' : 'yaml')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              viewMode === 'yaml' ? 'bg-purple-600/50 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
            )}
          >
            <FileCode className="h-3 w-3" />
            YAML
          </button>
        </div>
      </div>

      {/* Editor toolbar - shown in JSON/YAML views */}
      {isCodeView && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
          <button
            onClick={handleImport}
            disabled={!isDirty}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              importSuccess
                ? 'bg-green-600/60 text-white'
                : isDirty
                  ? 'bg-blue-600/60 text-white hover:bg-blue-600/80'
                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            )}
          >
            {importSuccess ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {importSuccess ? 'Importato!' : 'Importa modifiche'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
            title="Ricarica dallo store corrente"
          >
            <RotateCcw className="h-3 w-3" />
            Ricarica
          </button>
          {isDirty && !parseError && !importSuccess && (
            <span className="text-[10px] text-amber-400 ml-auto">Modifiche non salvate</span>
          )}
          {parseError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 ml-auto flex-1 min-w-0 justify-end">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{parseError}</span>
            </div>
          )}
          {importSuccess && (
            <span className="text-xs text-green-400 ml-auto">Configurazione importata nello store</span>
          )}
        </div>
      )}

      {viewMode === 'json' ? (
        /* JSON Editor */
        <div className="flex-1 overflow-auto">
          <textarea
            value={editorContent}
            onChange={handleEditorChange}
            spellCheck={false}
            className="w-full h-full min-h-[400px] bg-transparent text-[10px] font-mono text-gray-300 resize-none outline-none p-4 focus:bg-gray-900/50"
            placeholder="Incolla qui la configurazione JSON..."
          />
        </div>
      ) : viewMode === 'yaml' ? (
        /* YAML Editor */
        <div className="flex-1 overflow-auto">
          <textarea
            value={editorContent}
            onChange={handleEditorChange}
            spellCheck={false}
            className="w-full h-full min-h-[400px] bg-transparent text-[10px] font-mono text-purple-200 resize-none outline-none p-4 focus:bg-gray-900/50"
            placeholder="Incolla qui la configurazione YAML..."
          />
        </div>
      ) : (
        /* Summary view */
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Layers} label="Tab" count={tabs.length} color="purple" />
            <StatCard icon={Terminal} label="Comandi" count={commands.length} color="green" />
            <StatCard icon={Flag} label="Flag" count={flagParts.length} color="amber" />
            <StatCard icon={Cpu} label="Boot Stages" count={bootStages.length} color="blue" />
            <StatCard icon={FolderTree} label="Directory" count={dirs.length} color="cyan" />
            <StatCard icon={FolderTree} label="File" count={files.length} color="emerald" />
          </div>

          {/* Tabs detail */}
          {tabs.map(tab => {
            const tabCmds = commands.filter(c => c.tabId === tab.id);
            const tabStages = bootStages.filter(b => b.tabId === tab.id);
            const tabDirs = dirs.filter(d => d.tabId === tab.id);
            const tabFiles = files.filter(f => f.tabId === tab.id);

            return (
              <div key={tab.id} className="rounded border border-gray-700 bg-gray-800/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-sm font-medium text-white">{tab.name}</span>
                  <span className="text-[10px] text-gray-500 font-mono ml-auto">{tab.id}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-400">
                  <div>{tabCmds.length} comandi</div>
                  <div>{tabStages.length} boot stages</div>
                  <div>{tabDirs.length} directory</div>
                  <div>{tabFiles.length} file</div>
                </div>
                {tabCmds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tabCmds.slice(0, 20).map(cmd => (
                      <span key={cmd.id} className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-mono',
                        cmd.handler === 'builtin' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-green-600/20 text-green-400'
                      )}>
                        {cmd.name || '?'}
                      </span>
                    ))}
                    {tabCmds.length > 20 && (
                      <span className="text-[10px] text-gray-500">+{tabCmds.length - 20} altri</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Flag preview */}
          {flagParts.length > 0 && (
            <div className="rounded border border-amber-700/50 bg-amber-900/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Flag className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">Flag System</span>
              </div>
              <div className="font-mono text-xs text-amber-200/80 mb-2">{completeFlag}</div>
              <div className="flex flex-wrap gap-1">
                {flagParts.map(fp => (
                  <span key={fp.id} className="px-1.5 py-0.5 rounded bg-amber-700/30 text-[10px] font-mono text-amber-300">
                    {fp.id}: {fp.part}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, count, color }: { icon: typeof Terminal; label: string; count: number; color: string }) => {
  const colorMap: Record<string, string> = {
    purple: 'text-purple-400 bg-purple-400/10',
    green: 'text-green-400 bg-green-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    cyan: 'text-cyan-400 bg-cyan-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
  };
  const cls = colorMap[color] || colorMap.green;

  return (
    <div className="rounded border border-gray-700 bg-gray-800/40 p-2.5 flex items-center gap-2">
      <div className={cn('w-8 h-8 rounded flex items-center justify-center flex-shrink-0', cls.split(' ')[1])}>
        <Icon className={cn('h-4 w-4', cls.split(' ')[0])} />
      </div>
      <div>
        <div className="text-lg font-semibold text-white leading-tight">{count}</div>
        <div className="text-[10px] text-gray-400">{label}</div>
      </div>
    </div>
  );
};

export default SettingsCanvas;
