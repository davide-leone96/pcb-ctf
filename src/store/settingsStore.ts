// src/store/settingsStore.ts
'use client';

import { create } from 'zustand';
import type {
  HardwareComponent, MeasurementPin, UartPin, UartRole, Exercise,
  ObjectiveType, PinCondition, PinLogic, BootStageCondition,
} from '@/data/exercise';
import { SETTINGS_STORAGE_KEY, ALL_TOOLS, type Tool } from '@/data/exercise';
import type { CustomTool, ProbeConnectivity, ToolOutputType } from '@/types/custom-tool';

export type { ProbeConnectivity, ToolOutputType };

export type { PinCondition, PinLogic };

// --- Draft types ---

export interface DraftObjective {
  id: string;
  name: string;
  type: ObjectiveType;
  componentId: string;
  pinConditions: PinCondition[];
  pinLogic: PinLogic;
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number]; // solo per type='component'
  bootStageConditions: BootStageCondition[];
}

export type { BootStageCondition };

export interface DraftStep {
  id: string;
  title: string;
  description: string;
  availableTools: Tool[];
  objectives: DraftObjective[];
}

export interface DraftComponent {
  id: string;
  name: string;
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number];
}

export type PinType = 'custom' | 'tx' | 'rx' | 'gnd' | 'vcc';
export type PinShape = 'circle' | 'square';
export type ValueMode = 'fixed' | 'range';

export interface DraftPin {
  id: string;
  pinType: PinType;
  label: string;
  shape: PinShape;
  size: number;
  coords: [number, number];
  voltageMode: ValueMode;
  voltageFixed: number;
  voltageMin: number;
  voltageMax: number;
  resistanceMode: ValueMode;
  resistanceFixed: number;
  resistanceMin: number;
  resistanceMax: number;
  description: string;
  hint: string;
}

export type SettingsTool = 'component' | 'pin' | 'objective' | 'terminal-config' | 'tools-config';

// --- Custom Tool draft types ---

export interface DraftToolProbe {
  id: string;
  label: string;
  role: string;
  color: string;
  connectivity: ProbeConnectivity;
}

export interface DraftToolMode {
  id: string;
  name: string;
  shortName: string;
  unit: string;
}

export interface DraftCustomTool {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  probes: DraftToolProbe[];
  outputType: ToolOutputType;
  outputUnit: string;
  modes: DraftToolMode[];
}

export interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// --- Store types ---

interface SettingsState {
  activeTool: SettingsTool;
  components: DraftComponent[];
  activeComponentId: string | null;
  steps: DraftStep[];
  activeStepId: string | null;
  activeObjectiveId: string | null;
  pins: DraftPin[];
  activePinId: string | null;
  pendingPinCoords: [number, number] | null;
  dragState: DragState | null;
  pcbImagePath: string;
  canvasZoom: number;
  canvasRotation: number;
  canvasPanX: number;
  canvasPanY: number;
  canvasPanMode: boolean;
  // Custom tools (tab Strumenti)
  customTools: DraftCustomTool[];
  activeCustomToolId: string | null;
}

interface SettingsActions {
  setActiveTool: (tool: SettingsTool) => void;
  setPcbImagePath: (path: string) => void;

  // Canvas transform
  setCanvasZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setCanvasRotation: (degrees: number) => void;
  rotateBy: (degrees: number) => void;
  togglePanMode: () => void;
  resetCanvasTransform: () => void;
  setPan: (x: number, y: number) => void;

  // Image management
  uploadImage: (file: File) => Promise<{ success: boolean; path?: string; error?: string }>;
  deleteImage: () => Promise<void>;
  applyImageTransformations: () => Promise<{ success: boolean; error?: string }>;

  // Component actions (Init)
  editComponent: (id: string) => void;
  cancelComponentEdit: () => void;
  saveComponent: (data: Omit<DraftComponent, 'id' | 'coords'>) => void;
  updateComponent: (id: string, data: Partial<Omit<DraftComponent, 'id' | 'coords'>>) => void;
  updateComponentCoords: (id: string, coords: [number, number, number, number]) => void;
  deleteComponent: (id: string) => void;

  // Step actions
  addStep: () => void;
  deleteStep: (stepId: string) => void;
  reorderStep: (stepId: string, direction: 'up' | 'down') => void;
  selectStep: (stepId: string | null) => void;
  updateStep: (stepId: string, data: Partial<Pick<DraftStep, 'title' | 'description' | 'availableTools'>>) => void;
  toggleStepTool: (stepId: string, tool: Tool) => void;

  // Objective actions
  addObjective: (stepId: string, componentId: string) => void;
  addPinObjective: (stepId: string, pinIds: string[], logic: PinLogic) => void;
  addTerminalObjective: (stepId: string) => void;
  deleteObjective: (stepId: string, objectiveId: string) => void;
  reorderObjective: (stepId: string, objectiveId: string, direction: 'up' | 'down') => void;
  editObjective: (objectiveId: string) => void;
  cancelObjectiveEdit: () => void;
  saveObjective: (data: Omit<DraftObjective, 'id' | 'coords' | 'type' | 'componentId'>) => void;
  updateObjective: (id: string, data: Partial<Omit<DraftObjective, 'id' | 'coords' | 'type' | 'componentId'>>) => void;

  // Canvas drag
  startDrag: (x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;

  // Pin actions
  placePin: (x: number, y: number) => void;
  movePinCoords: (x: number, y: number) => void;
  cancelPinEdit: () => void;
  savePin: (data: Omit<DraftPin, 'id' | 'coords'>) => void;
  updatePin: (id: string, data: Partial<Omit<DraftPin, 'id' | 'coords'>>) => void;
  liveUpdatePin: (id: string, data: Partial<Omit<DraftPin, 'id' | 'coords'>>) => void;
  updatePinCoords: (id: string, coords: [number, number]) => void;
  deletePin: (id: string) => void;
  editPin: (id: string) => void;

  // Export, Apply & Load
  exportAsJson: () => string;
  exportAsTypeScript: () => string;
  applyConfig: () => void;
  loadFromStorage: () => void;
  saveToFile: () => Promise<{ success: boolean; message?: string; error?: string }>;
  loadFromFile: () => Promise<{ success: boolean; message?: string; error?: string }>;
  resetAllConfig: () => void;
  resetInitComponents: () => void;

  // Custom tool actions (tab Strumenti)
  addCustomTool: () => void;
  updateCustomTool: (id: string, updates: Partial<Omit<DraftCustomTool, 'id' | 'probes' | 'modes'>>) => void;
  deleteCustomTool: (id: string) => void;
  selectCustomTool: (id: string | null) => void;
  addProbeToTool: (toolId: string) => void;
  updateProbe: (toolId: string, probeId: string, updates: Partial<Omit<DraftToolProbe, 'id'>>) => void;
  deleteProbe: (toolId: string, probeId: string) => void;
  addModeToTool: (toolId: string) => void;
  updateMode: (toolId: string, modeId: string, updates: Partial<Omit<DraftToolMode, 'id'>>) => void;
  deleteMode: (toolId: string, modeId: string) => void;
  uploadToolImage: (toolId: string, file: File) => Promise<{ success: boolean; path?: string; error?: string }>;
}

type SettingsStore = SettingsState & SettingsActions;

/** Genera un ID univoco con prefisso, basato su hash del timestamp in ms + componente random */
const generateId = (prefix: string): string => {
  const hash = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  return `${prefix}-${hash}`;
};

const resolveValue = (mode: ValueMode, fixed: number, min: number, max: number): number => {
  if (mode === 'fixed') return fixed;
  return min + Math.random() * (max - min);
};

const dragToCoords = (drag: DragState): [number, number, number, number] => {
  const left = Math.min(drag.startX, drag.currentX);
  const top = Math.min(drag.startY, drag.currentY);
  const width = Math.abs(drag.currentX - drag.startX);
  const height = Math.abs(drag.currentY - drag.startY);
  return [left, top, width, height];
};

/** Trova l'obiettivo e il suo step dato l'objectiveId */
const findObjectiveInSteps = (
  steps: DraftStep[],
  objectiveId: string
): { step: DraftStep; objective: DraftObjective; stepIndex: number; objIndex: number } | null => {
  for (let si = 0; si < steps.length; si++) {
    const step = steps[si];
    for (let oi = 0; oi < step.objectives.length; oi++) {
      if (step.objectives[oi].id === objectiveId) {
        return { step, objective: step.objectives[oi], stepIndex: si, objIndex: oi };
      }
    }
  }
  return null;
};

/** Aggiorna gli obiettivi di uno step specifico */
const updateStepObjectives = (
  steps: DraftStep[],
  stepId: string,
  updater: (objectives: DraftObjective[]) => DraftObjective[]
): DraftStep[] =>
  steps.map(s => s.id === stepId ? { ...s, objectives: updater(s.objectives) } : s);

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state
  activeTool: 'component',
  components: [],
  activeComponentId: null,
  steps: [],
  activeStepId: null,
  activeObjectiveId: null,
  pins: [],
  activePinId: null,
  pendingPinCoords: null,
  dragState: null,
  pcbImagePath: '',
  canvasZoom: 1,
  canvasRotation: 0,
  canvasPanX: 0,
  canvasPanY: 0,
  canvasPanMode: false,
  customTools: [],
  activeCustomToolId: null,

  // --- Tool ---

  setActiveTool: (tool) => {
    const state = get();
    // Cancel pending component edits
    if (state.activeComponentId) {
      const comp = state.components.find(c => c.id === state.activeComponentId);
      if (comp && comp.name === '') {
        set({ components: state.components.filter(c => c.id !== state.activeComponentId) });
      }
    }
    // Cancel pending objective edits
    if (state.activeObjectiveId) {
      const found = findObjectiveInSteps(state.steps, state.activeObjectiveId);
      if (found && found.objective.name === '') {
        set({
          steps: updateStepObjectives(state.steps, found.step.id,
            objs => objs.filter(o => o.id !== state.activeObjectiveId)),
        });
      }
    }
    // Cancel pending pin edits
    if (state.activePinId) {
      const pin = state.pins.find(p => p.id === state.activePinId);
      if (pin && pin.label === '') {
        set({ pins: state.pins.filter(p => p.id !== state.activePinId) });
      }
    }
    set({
      activeTool: tool,
      dragState: null,
      activeComponentId: null,
      activeObjectiveId: null,
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  setPcbImagePath: (path) => set({ pcbImagePath: path }),

  // --- Canvas transform ---

  setCanvasZoom: (zoom) => set({ canvasZoom: Math.max(0.25, Math.min(4, zoom)) }),
  zoomIn: () => set(s => ({ canvasZoom: Math.min(4, s.canvasZoom + 0.25) })),
  zoomOut: () => set(s => ({ canvasZoom: Math.max(0.25, s.canvasZoom - 0.25) })),
  setCanvasRotation: (degrees) => set({ canvasRotation: degrees }),
  rotateBy: (degrees) => set(s => ({ canvasRotation: s.canvasRotation + degrees })),
  togglePanMode: () => set(s => ({ canvasPanMode: !s.canvasPanMode })),
  resetCanvasTransform: () => set({ canvasZoom: 1, canvasRotation: 0, canvasPanX: 0, canvasPanY: 0, canvasPanMode: false }),
  setPan: (x, y) => set({ canvasPanX: x, canvasPanY: y }),

  uploadImage: async (file) => {
    // Salva il path dell'immagine vecchia da eliminare dopo
    const oldImagePath = get().pcbImagePath;

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/images/upload', { method: 'POST', body: formData });
      const result = await response.json();

      if (result.success) {
        set({ pcbImagePath: result.path });

        // Elimina la vecchia immagine solo se è un'immagine di lavoro temporanea.
        // Le immagini preset-owned (preset-*.ext) sono gestite dall'API dei preset
        // e non devono essere eliminate qui per non rompere altri preset.
        const isDefault = oldImagePath === '/images/pcb_v2.jpg';
        const isPresetOwned = /\/images\/preset-[^/]+\.[^/]+$/.test(oldImagePath ?? '');
        if (oldImagePath && !isDefault && !isPresetOwned) {
          try {
            await fetch('/api/images/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imagePath: oldImagePath }),
            });
          } catch (error) {
            console.warn('Failed to delete old image:', error);
          }
        }
      }

      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  deleteImage: async () => {
    const { pcbImagePath } = get();
    // Elimina l'immagine corrente se non è vuota e non è quella di default
    if (pcbImagePath && pcbImagePath !== '/images/pcb_v2.jpg') {
      try {
        await fetch('/api/images/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: pcbImagePath }),
        });
      } catch { /* ignore */ }
    }
    // Resetta a nessuna immagine e pulisce componenti e pin della tab Init
    set({
      pcbImagePath: '',
      canvasZoom: 1,
      canvasRotation: 0,
      canvasPanX: 0,
      canvasPanY: 0,
      components: [],
      pins: [],
      activeComponentId: null,
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  applyImageTransformations: async () => {
    const { pcbImagePath, canvasZoom, canvasRotation, canvasPanX, canvasPanY, components, pins, steps } = get();

    // Verifica che ci sia un'immagine caricata
    if (!pcbImagePath) {
      return { success: false, error: 'Nessuna immagine caricata' };
    }

    // Se non ci sono trasformazioni da applicare, return
    if (canvasZoom === 1 && canvasRotation === 0 && canvasPanX === 0 && canvasPanY === 0) {
      return { success: false, error: 'Nessuna trasformazione da applicare' };
    }

    // Salva il path dell'immagine vecchia da eliminare dopo
    const oldImagePath = pcbImagePath;

    try {
      // Carica l'immagine corrente
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = pcbImagePath;
      });

      // Calcola le dimensioni del canvas trasformato
      const angleRad = (canvasRotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(angleRad));
      const sin = Math.abs(Math.sin(angleRad));

      // Dimensioni del canvas: solo rotazione, SENZA zoom (per cropping)
      const rotatedWidth = img.width * cos + img.height * sin;
      const rotatedHeight = img.width * sin + img.height * cos;

      // Crea canvas con dimensioni originali (ruotate ma non zoomate)
      const canvas = document.createElement('canvas');
      canvas.width = rotatedWidth;
      canvas.height = rotatedHeight;
      const ctx = canvas.getContext('2d')!;

      // Applica trasformazioni nello stesso ordine del CSS: pan → zoom → rotate
      // Converti pan da percentuale a pixel dell'immagine
      const panXPx = (canvasPanX / 100) * img.width;
      const panYPx = (canvasPanY / 100) * img.height;

      // Il pan sposta il centro di rotazione/zoom
      ctx.translate(rotatedWidth / 2 + panXPx, rotatedHeight / 2 + panYPx);
      ctx.rotate(angleRad);
      ctx.scale(canvasZoom, canvasZoom);
      ctx.translate(-img.width / 2, -img.height / 2);
      ctx.drawImage(img, 0, 0);

      // Converti canvas in blob (PNG per qualità massima senza perdita)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png');
      });

      // Carica la nuova immagine (uploadImage si occupa già di eliminare la vecchia)
      const file = new File([blob], 'transformed-pcb.png', { type: 'image/png' });
      const uploadResult = await get().uploadImage(file);

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Nota: uploadImage() ha già eliminato la vecchia immagine automaticamente

      // Trasforma le coordinate (con cropping e pan)
      const transformCoord = (x: number, y: number): [number, number] => {
        // Converti % -> pixel (immagine originale)
        const xPx = (x / 100) * img.width;
        const yPx = (y / 100) * img.height;

        // Trasformazioni nello stesso ordine del canvas: pan → rotate → scale
        // 1. Posizione relativa al centro dell'immagine
        let tx = xPx - img.width / 2;
        let ty = yPx - img.height / 2;

        // 2. Applica zoom
        tx *= canvasZoom;
        ty *= canvasZoom;

        // 3. Applica rotazione
        const rotX = tx * Math.cos(angleRad) - ty * Math.sin(angleRad);
        const rotY = tx * Math.sin(angleRad) + ty * Math.cos(angleRad);

        // 4. Trasla al centro del canvas con offset pan (converti pan % -> pixel)
        const finalX = rotX + rotatedWidth / 2 + panXPx;
        const finalY = rotY + rotatedHeight / 2 + panYPx;

        // Converti pixel -> % (canvas croppato)
        return [(finalX / rotatedWidth) * 100, (finalY / rotatedHeight) * 100];
      };

      // Trasforma componenti
      const transformedComponents = components.map(comp => {
        const [left, top, width, height] = comp.coords;

        // Trasforma tutti e 4 gli angoli del rettangolo
        const topLeft = transformCoord(left, top);
        const topRight = transformCoord(left + width, top);
        const bottomLeft = transformCoord(left, top + height);
        const bottomRight = transformCoord(left + width, top + height);

        // Calcola il bounding box che contiene tutti i punti trasformati
        const allX = [topLeft[0], topRight[0], bottomLeft[0], bottomRight[0]];
        const allY = [topLeft[1], topRight[1], bottomLeft[1], bottomRight[1]];

        const newLeft = Math.min(...allX);
        const newTop = Math.min(...allY);
        const newWidth = Math.max(...allX) - newLeft;
        const newHeight = Math.max(...allY) - newTop;

        return {
          ...comp,
          coords: [newLeft, newTop, newWidth, newHeight] as [number, number, number, number],
        };
      });

      // Trasforma pin
      const transformedPins = pins.map(pin => {
        const [x, y] = pin.coords;
        const [newX, newY] = transformCoord(x, y);
        return { ...pin, coords: [newX, newY] as [number, number] };
      });

      // Trasforma obiettivi negli step
      const transformedSteps = steps.map(step => ({
        ...step,
        objectives: step.objectives.map(obj => {
          if (obj.type === 'component' && obj.coords) {
            const [left, top, width, height] = obj.coords;

            // Trasforma tutti e 4 gli angoli del rettangolo
            const topLeft = transformCoord(left, top);
            const topRight = transformCoord(left + width, top);
            const bottomLeft = transformCoord(left, top + height);
            const bottomRight = transformCoord(left + width, top + height);

            // Calcola il bounding box che contiene tutti i punti trasformati
            const allX = [topLeft[0], topRight[0], bottomLeft[0], bottomRight[0]];
            const allY = [topLeft[1], topRight[1], bottomLeft[1], bottomRight[1]];

            const newLeft = Math.min(...allX);
            const newTop = Math.min(...allY);
            const newWidth = Math.max(...allX) - newLeft;
            const newHeight = Math.max(...allY) - newTop;

            return {
              ...obj,
              coords: [newLeft, newTop, newWidth, newHeight] as [number, number, number, number],
            };
          }
          return obj;
        }),
      }));

      // Aggiorna lo stato
      set({
        pcbImagePath: uploadResult.path!,
        components: transformedComponents,
        pins: transformedPins,
        steps: transformedSteps,
        canvasZoom: 1,
        canvasRotation: 0,
        canvasPanX: 0,
        canvasPanY: 0,
        canvasPanMode: false,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error applying transformations:', error);
      return { success: false, error: error.message };
    }
  },

  // --- Component actions (Init) ---

  editComponent: (id) => {
    set({
      activeComponentId: id,
      activeObjectiveId: null,
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  cancelComponentEdit: () => {
    const { activeComponentId, components } = get();
    if (!activeComponentId) return;
    const comp = components.find(c => c.id === activeComponentId);
    if (comp && comp.name === '') {
      set({
        components: components.filter(c => c.id !== activeComponentId),
        activeComponentId: null,
      });
    } else {
      set({ activeComponentId: null });
    }
  },

  saveComponent: (data) => {
    const { activeComponentId, components } = get();
    if (!activeComponentId) return;
    set({
      components: components.map(c => c.id === activeComponentId ? { ...c, ...data } : c),
      activeComponentId: null,
    });
  },

  updateComponent: (id, data) => {
    set({
      components: get().components.map(c => c.id === id ? { ...c, ...data } : c),
      activeComponentId: null,
    });
  },

  updateComponentCoords: (id, coords) => {
    // Aggiorna le coordinate del componente
    set({
      components: get().components.map(c => c.id === id ? { ...c, coords } : c),
      // Sincronizza le coordinate negli obiettivi degli step che referenziano questo componente
      steps: get().steps.map(step => ({
        ...step,
        objectives: step.objectives.map(obj =>
          obj.type === 'component' && obj.componentId === id
            ? { ...obj, coords }
            : obj
        ),
      })),
    });
  },

  deleteComponent: (id) => {
    set({
      components: get().components.filter(c => c.id !== id),
      activeComponentId: get().activeComponentId === id ? null : get().activeComponentId,
    });
  },

  // --- Step actions ---

  addStep: () => {
    const { steps } = get();
    const id = generateId('step');
    const newStep: DraftStep = {
      id,
      title: '',
      description: '',
      availableTools: [...ALL_TOOLS],
      objectives: [],
    };
    set({
      steps: [...steps, newStep],
      activeStepId: id,
    });
  },

  deleteStep: (stepId) => {
    const { steps, activeStepId } = get();
    const filtered = steps.filter(s => s.id !== stepId);
    set({
      steps: filtered,
      activeStepId: activeStepId === stepId ? (filtered[0]?.id ?? null) : activeStepId,
      activeObjectiveId: null,
    });
  },

  reorderStep: (stepId, direction) => {
    const { steps } = get();
    const index = steps.findIndex(s => s.id === stepId);
    if (index < 0) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    set({ steps: newSteps });
  },

  selectStep: (stepId) => set({ activeStepId: stepId, activeObjectiveId: null }),

  updateStep: (stepId, data) => {
    set({
      steps: get().steps.map(s => s.id === stepId ? { ...s, ...data } : s),
    });
  },

  toggleStepTool: (stepId, tool) => {
    set({
      steps: get().steps.map(s => {
        if (s.id !== stepId) return s;
        const has = s.availableTools.includes(tool);
        return {
          ...s,
          availableTools: has
            ? s.availableTools.filter(t => t !== tool)
            : [...s.availableTools, tool],
        };
      }),
    });
  },

  // --- Objective actions ---

  addObjective: (stepId, componentId) => {
    const comp = get().components.find(c => c.id === componentId);
    if (!comp) return;
    const id = generateId('obj');
    const newObj: DraftObjective = {
      id,
      name: comp.name,
      type: 'component',
      componentId,
      pinConditions: [],
      pinLogic: 'AND',
      instruction: '',
      hint: '',
      flagPart: '',
      coords: comp.coords,
      bootStageConditions: [],
    };
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => [...objs, newObj]),
      activeObjectiveId: id,
      activeStepId: stepId,
    });
  },

  addPinObjective: (stepId, pinIds, logic) => {
    const { pins } = get();
    const selectedPins = pins.filter(p => pinIds.includes(p.id));
    if (selectedPins.length === 0) return;
    const id = generateId('obj');
    const name = selectedPins.map(p => p.label || p.pinType.toUpperCase()).join(', ');
    const pinConditions: PinCondition[] = pinIds.map(pinId => ({ pinId, terminal: '' }));
    const newObj: DraftObjective = {
      id,
      name,
      type: 'pin',
      componentId: '',
      pinConditions,
      pinLogic: logic,
      instruction: '',
      hint: '',
      flagPart: '',
      coords: [0, 0, 0, 0],
      bootStageConditions: [],
    };
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => [...objs, newObj]),
      activeObjectiveId: id,
      activeStepId: stepId,
    });
  },

  addTerminalObjective: (stepId) => {
    const id = generateId('obj');
    const newObj: DraftObjective = {
      id,
      name: 'Terminale',
      type: 'terminal',
      componentId: '',
      pinConditions: [],
      pinLogic: 'AND',
      instruction: '',
      hint: '',
      flagPart: '',
      coords: [0, 0, 0, 0],
      bootStageConditions: [],
    };
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => [...objs, newObj]),
      activeObjectiveId: id,
      activeStepId: stepId,
    });
  },

  deleteObjective: (stepId, objectiveId) => {
    const { activeObjectiveId } = get();
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => objs.filter(o => o.id !== objectiveId)),
      activeObjectiveId: activeObjectiveId === objectiveId ? null : activeObjectiveId,
    });
  },

  reorderObjective: (stepId, objectiveId, direction) => {
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => {
        const index = objs.findIndex(o => o.id === objectiveId);
        if (index < 0) return objs;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= objs.length) return objs;
        const newObjs = [...objs];
        [newObjs[index], newObjs[newIndex]] = [newObjs[newIndex], newObjs[index]];
        return newObjs;
      }),
    });
  },

  editObjective: (objectiveId) => {
    const found = findObjectiveInSteps(get().steps, objectiveId);
    if (!found) return;
    set({
      activeObjectiveId: objectiveId,
      activeStepId: found.step.id,
      activeComponentId: null,
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  cancelObjectiveEdit: () => {
    const { activeObjectiveId, steps } = get();
    if (!activeObjectiveId) return;
    const found = findObjectiveInSteps(steps, activeObjectiveId);
    if (found && found.objective.name === '') {
      set({
        steps: updateStepObjectives(steps, found.step.id,
          objs => objs.filter(o => o.id !== activeObjectiveId)),
        activeObjectiveId: null,
      });
    } else {
      set({ activeObjectiveId: null });
    }
  },

  saveObjective: (data) => {
    const { activeObjectiveId, steps } = get();
    if (!activeObjectiveId) return;
    const found = findObjectiveInSteps(steps, activeObjectiveId);
    if (!found) return;
    set({
      steps: updateStepObjectives(steps, found.step.id,
        objs => objs.map(o => o.id === activeObjectiveId ? { ...o, ...data } : o)),
      activeObjectiveId: null,
    });
  },

  updateObjective: (id, data) => {
    const { steps } = get();
    const found = findObjectiveInSteps(steps, id);
    if (!found) return;
    set({
      steps: updateStepObjectives(steps, found.step.id,
        objs => objs.map(o => o.id === id ? { ...o, ...data } : o)),
      activeObjectiveId: null,
    });
  },

  // --- Canvas drag (for component tool AND objective tool) ---

  startDrag: (x, y) => {
    const state = get();
    if (state.activeTool !== 'component') return;

    // Cancel current component edit
    if (state.activeComponentId) {
      const comp = state.components.find(c => c.id === state.activeComponentId);
      if (comp && comp.name === '') {
        set({ components: state.components.filter(c => c.id !== state.activeComponentId) });
      }
    }
    // Cancel current objective edit
    if (state.activeObjectiveId) {
      const found = findObjectiveInSteps(state.steps, state.activeObjectiveId);
      if (found && found.objective.name === '') {
        set({
          steps: updateStepObjectives(state.steps, found.step.id,
            objs => objs.filter(o => o.id !== state.activeObjectiveId)),
        });
      }
    }
    set({
      dragState: { startX: x, startY: y, currentX: x, currentY: y },
      activeComponentId: null,
      activeObjectiveId: null,
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  updateDrag: (x, y) => {
    const { dragState } = get();
    if (!dragState) return;
    set({ dragState: { ...dragState, currentX: x, currentY: y } });
  },

  endDrag: () => {
    const { dragState, activeTool, activeStepId, steps, components } = get();
    if (!dragState) return;
    const coords = dragToCoords(dragState);
    if (coords[2] < 1 || coords[3] < 1) {
      set({ dragState: null });
      return;
    }

    if (activeTool === 'component') {
      const id = generateId('comp');
      const newComp: DraftComponent = {
        id, name: '', instruction: '', hint: '', flagPart: '', coords,
      };
      set({
        components: [...components, newComp],
        dragState: null,
        activeComponentId: id,
      });
    } else {
      set({ dragState: null });
    }
  },

  // --- Pin actions (global, unchanged logic) ---

  placePin: (x, y) => {
    const state = get();
    if (state.activePinId) {
      const pin = state.pins.find(p => p.id === state.activePinId);
      if (pin && pin.label === '') {
        set({ pins: state.pins.filter(p => p.id !== state.activePinId) });
      }
    }
    const id = generateId('pin');
    const newPin: DraftPin = {
      id,
      pinType: 'custom',
      label: '',
      shape: 'circle',
      size: 2,
      coords: [x, y],
      voltageMode: 'fixed',
      voltageFixed: 0,
      voltageMin: 0,
      voltageMax: 5,
      resistanceMode: 'fixed',
      resistanceFixed: 0,
      resistanceMin: 10,
      resistanceMax: 1000,
      description: '',
      hint: '',
    };
    set({
      pins: [...state.pins, newPin],
      activePinId: id,
      pendingPinCoords: [x, y],
    });
  },

  movePinCoords: (x, y) => {
    const { activePinId, pins } = get();
    if (!activePinId) return;
    set({
      pins: pins.map(p => p.id === activePinId ? { ...p, coords: [x, y] as [number, number] } : p),
      pendingPinCoords: [x, y],
    });
  },

  cancelPinEdit: () => {
    const { activePinId, pins } = get();
    if (!activePinId) return;
    const pin = pins.find(p => p.id === activePinId);
    if (pin && pin.label === '') {
      set({
        pins: pins.filter(p => p.id !== activePinId),
        activePinId: null,
        pendingPinCoords: null,
      });
    } else {
      set({ activePinId: null, pendingPinCoords: null });
    }
  },

  savePin: (data) => {
    const { activePinId, pins } = get();
    if (!activePinId) return;
    set({
      pins: pins.map(p => p.id === activePinId ? { ...p, ...data } : p),
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  updatePin: (id, data) => {
    set({
      pins: get().pins.map(p => p.id === id ? { ...p, ...data } : p),
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  // Like updatePin but keeps the popup open — used for live-preview fields (e.g. size slider).
  liveUpdatePin: (id, data) => {
    set({ pins: get().pins.map(p => p.id === id ? { ...p, ...data } : p) });
  },

  updatePinCoords: (id: string, coords: [number, number]) => {
    set({
      pins: get().pins.map(p => p.id === id ? { ...p, coords } : p),
    });
  },

  deletePin: (id) => {
    set({
      pins: get().pins.filter(p => p.id !== id),
      activePinId: get().activePinId === id ? null : get().activePinId,
      pendingPinCoords: get().activePinId === id ? null : get().pendingPinCoords,
    });
  },

  editPin: (id) => {
    const pin = get().pins.find(p => p.id === id);
    if (!pin) return;
    set({
      activePinId: id,
      activeComponentId: null,
      activeObjectiveId: null,
      pendingPinCoords: pin.coords,
    });
  },

  // --- Export ---

  exportAsJson: () => {
    const { steps, components, pins, pcbImagePath, customTools } = get();

    // Converti step e obiettivi
    const exportSteps = steps.map(s => {
      const objectives = s.objectives.map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        ...(o.type === 'component' && o.componentId ? { componentId: o.componentId } : {}),
        instruction: o.instruction,
        hint: o.hint,
        flagPart: o.flagPart || o.name.toUpperCase().replace(/\s+/g, '_'),
        coords: o.coords,
        ...(o.type === 'pin' && o.pinConditions.length > 0
          ? { pinConditions: o.pinConditions, pinLogic: o.pinLogic }
          : {}),
        ...(o.type === 'terminal' && o.bootStageConditions.length > 0
          ? { bootStageConditions: o.bootStageConditions }
          : {}),
      }));
      const flagParts = objectives.map(o => o.flagPart).join('');
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        expectedFlag: `flag{${flagParts}}`,
        availableTools: s.availableTools,
        objectives,
      };
    });

    // Init components (globali)
    const initComponents: HardwareComponent[] = components.map(c => ({
      id: c.id,
      name: c.name,
      instruction: c.instruction,
      hint: c.hint,
      flagPart: c.flagPart || c.name.toUpperCase().replace(/\s+/g, '_'),
      coords: c.coords,
    }));

    // Retrocompatibilità: anche component objectives dagli step
    const stepComponents: HardwareComponent[] = steps.flatMap(s =>
      s.objectives
        .filter(o => o.type === 'component')
        .map(o => ({
          id: o.id,
          name: o.name,
          instruction: o.instruction,
          hint: o.hint,
          flagPart: o.flagPart || o.name.toUpperCase().replace(/\s+/g, '_'),
          coords: o.coords,
        }))
    );

    const hardwareComponents = [...initComponents, ...stepComponents];

    const measurementPins: MeasurementPin[] = pins
      .filter(p => p.pinType === 'custom')
      .map(p => ({
        id: p.id,
        valueV: resolveValue(p.voltageMode, p.voltageFixed, p.voltageMin, p.voltageMax),
        valueOhm: resolveValue(p.resistanceMode, p.resistanceFixed, p.resistanceMin, p.resistanceMax),
        coords: [p.coords[0] - p.size / 2, p.coords[1] - p.size / 2, p.size, p.size] as [number, number, number, number],
      }));

    const uartPins: UartPin[] = pins
      .filter(p => p.pinType !== 'custom')
      .map(p => ({
        id: p.id,
        role: p.pinType as UartRole,
        label: p.label,
        coords: [p.coords[0] - p.size / 2, p.coords[1] - p.size / 2, p.size, p.size] as [number, number, number, number],
      }));

    // initialFlag basata sul primo step
    const firstStepFlagLen = exportSteps[0]?.objectives.map(o => o.flagPart).join('').length || 20;

    const exportedCustomTools: CustomTool[] = customTools
      .filter(t => t.name.trim() !== '')
      .map(t => ({
        id: t.id,
        name: t.name,
        ...(t.description ? { description: t.description } : {}),
        ...(t.imagePath ? { imagePath: t.imagePath } : {}),
        probes: t.probes,
        outputType: t.outputType,
        ...(t.outputUnit ? { outputUnit: t.outputUnit } : {}),
        ...(t.modes.length > 0 ? { modes: t.modes } : {}),
      }));

    const exercise: Exercise = {
      pcbImage: pcbImagePath,
      steps: exportSteps,
      components: hardwareComponents,
      pins: measurementPins,
      uartPins,
      initialFlag: `flag{${'?'.repeat(firstStepFlagLen)}}`,
      ...(exportedCustomTools.length > 0 ? { customTools: exportedCustomTools } : {}),
    };

    return JSON.stringify(exercise, null, 2);
  },

  exportAsTypeScript: () => {
    const json = get().exportAsJson();
    return `import type { Exercise } from '@/data/exercise';\n\nexport const exerciseData: Exercise = ${json};\n`;
  },

  applyConfig: () => {
    const json = get().exportAsJson();
    localStorage.setItem(SETTINGS_STORAGE_KEY, json);
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!saved) {
        // No saved config — reset to empty state (do not load hardcoded defaults).
        set({
          components: [],
          activeComponentId: null,
          steps: [],
          activeStepId: null,
          activeObjectiveId: null,
          pins: [],
          activePinId: null,
          pendingPinCoords: null,
          dragState: null,
          pcbImagePath: '',
          canvasZoom: 1,
          canvasRotation: 0,
          canvasPanX: 0,
          canvasPanY: 0,
          canvasPanMode: false,
          customTools: [],
          activeCustomToolId: null,
        });
        return;
      }
      const raw: Exercise = JSON.parse(saved);
      // Use raw data as-is: the editor must reflect exactly what was saved.
      // mergeWithDefaultSteps is intentionally NOT called here — it is only
      // used by the simulator (loadExerciseData in exercise.ts) to guarantee
      // the fixed UART/terminal steps are present at runtime.
      const exercise = raw;

      // Converti steps → DraftStep[] con DraftObjective[]
      let draftSteps: DraftStep[] = [];
      let draftComponents: DraftComponent[] = [];

      if (exercise.steps && exercise.steps.length > 0) {
        // Raccogli gli ID di tutti gli obiettivi component dentro gli step
        const stepObjIds = new Set<string>();

        draftSteps = exercise.steps.map((s, si) => {
          const id = s.id || generateId('step');
          return {
            id,
            title: s.title || `Step ${si + 1}`,
            description: s.description || '',
            availableTools: (s as any).availableTools || [...ALL_TOOLS],
            objectives: (s.objectives || []).map((o, oi) => {
              const objId = o.id || generateId('obj');
              if (!o.type || o.type === 'component') stepObjIds.add(objId);
              return {
                id: objId,
                name: o.name || '',
                type: (o.type || 'component') as ObjectiveType,
                componentId: (o as any).componentId || '',
                pinConditions: (o as any).pinConditions || ((o as any).pinIds || []).map((pid: string) => ({ pinId: pid, terminal: '' })),
                pinLogic: ((o as any).pinLogic || 'AND') as PinLogic,
                instruction: o.instruction || '',
                hint: o.hint || '',
                flagPart: o.flagPart || '',
                coords: o.coords || [0, 0, 0, 0],
                bootStageConditions: (o as any).bootStageConditions || [],
              };
            }),
          };
        });

        // Componenti globali = exercise.components che NON sono step objectives
        if (exercise.components) {
          draftComponents = exercise.components
            .filter(c => !stepObjIds.has(c.id))
            .map((c, i) => {
              const id = c.id || generateId('comp');
              return {
                id,
                name: c.name || '',
                instruction: c.instruction || '',
                hint: c.hint || '',
                flagPart: c.flagPart || '',
                coords: c.coords || [0, 0, 0, 0],
              };
            });
        }
      } else if (exercise.components && exercise.components.length > 0) {
        // Formato vecchio: solo components flat → Init components + un default step
        draftComponents = exercise.components.map((c, i) => {
          const id = c.id || generateId('comp');
          return {
            id,
            name: c.name,
            instruction: c.instruction,
            hint: c.hint,
            flagPart: c.flagPart,
            coords: c.coords,
          };
        });
        draftSteps = [{
          id: 'step-1',
          title: 'Hardware Analysis',
          description: '',
          availableTools: [...ALL_TOOLS],
          objectives: exercise.components.map((c, i) => ({
            id: `obj-from-${c.id || i}`,
            name: c.name,
            type: 'component' as const,
            componentId: c.id || '',
            pinConditions: [],
            pinLogic: 'AND' as PinLogic,
            instruction: c.instruction,
            hint: c.hint,
            flagPart: c.flagPart,
            coords: c.coords,
            bootStageConditions: [],
          })),
        }];
      }

      // Converti pin
      const mPins: DraftPin[] = (exercise.pins || []).map((p, i) => {
        const id = `pin-m-${i + 1}`;
        const [left, top, width, height] = p.coords;
        return {
          id, pinType: 'custom' as const, label: p.id,
          shape: 'circle' as const, size: Math.max(width, height),
          coords: [left + width / 2, top + height / 2] as [number, number],
          voltageMode: 'fixed' as const, voltageFixed: p.valueV, voltageMin: 0, voltageMax: 5,
          resistanceMode: 'fixed' as const, resistanceFixed: p.valueOhm, resistanceMin: 10, resistanceMax: 1000,
          description: '', hint: '',
        };
      });

      const uPins: DraftPin[] = (exercise.uartPins || []).map((p, i) => {
        const id = `pin-u-${i + 1}`;
        const [left, top, width, height] = p.coords;
        const uartDefaults: Record<string, { v: number; r: number }> = {
          vcc: { v: 5.0, r: 0 }, tx: { v: 3.3, r: 50 }, rx: { v: 3.3, r: 10000 }, gnd: { v: 0, r: 0 },
        };
        const d = uartDefaults[p.role] || { v: 0, r: 0 };
        return {
          id, pinType: p.role as PinType, label: p.label,
          shape: 'circle' as const, size: Math.max(width, height),
          coords: [left + width / 2, top + height / 2] as [number, number],
          voltageMode: 'fixed' as const, voltageFixed: d.v, voltageMin: 0, voltageMax: 5,
          resistanceMode: 'fixed' as const, resistanceFixed: d.r, resistanceMin: 10, resistanceMax: 1000,
          description: '', hint: '',
        };
      });

      // Converti customTools salvati → DraftCustomTool[]
      const draftCustomTools: DraftCustomTool[] = (exercise.customTools ?? []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description ?? '',
        imagePath: t.imagePath ?? '',
        probes: (t.probes ?? []).map(p => ({
          id: p.id,
          label: p.label,
          role: p.role,
          color: p.color,
          connectivity: p.connectivity,
        })),
        outputType: t.outputType,
        outputUnit: t.outputUnit ?? '',
        modes: (t.modes ?? []).map(m => ({
          id: m.id,
          name: m.name,
          shortName: m.shortName,
          unit: m.unit,
        })),
      }));

      set({
        components: draftComponents,
        activeComponentId: null,
        steps: draftSteps,
        activeStepId: draftSteps[0]?.id ?? null,
        activeObjectiveId: null,
        pins: [...mPins, ...uPins],
        activePinId: null,
        pendingPinCoords: null,
        dragState: null,
        pcbImagePath: exercise.pcbImage || '',
        canvasZoom: 1,
        canvasRotation: 0,
        canvasPanX: 0,
        canvasPanY: 0,
        canvasPanMode: false,
        customTools: draftCustomTools,
        activeCustomToolId: null,
      });
    } catch { /* ignore invalid data */ }
  },

  saveToFile: async () => {
    try {
      const json = get().exportAsJson();
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, json);
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  loadFromFile: async () => {
    try {
      const response = await fetch('/api/config/load');
      const result = await response.json();
      if (result.success && result.data) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(result.data));
        get().loadFromStorage();
        return { success: true, message: 'Configurazione caricata con successo' };
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  resetAllConfig: () => {
    // Cancella localStorage
    localStorage.removeItem(SETTINGS_STORAGE_KEY);

    // Resetta lo stato ai valori iniziali
    set({
      activeTool: 'component',
      components: [],
      activeComponentId: null,
      steps: [],
      activeStepId: null,
      activeObjectiveId: null,
      pins: [],
      activePinId: null,
      pendingPinCoords: null,
      dragState: null,
      pcbImagePath: '',
      canvasZoom: 1,
      canvasRotation: 0,
      canvasPanX: 0,
      canvasPanY: 0,
      canvasPanMode: false,
      customTools: [],
      activeCustomToolId: null,
    });
  },

  resetInitComponents: () => {
    // Resetta solo componenti e pin della tab Init
    set({
      components: [],
      pins: [],
      activeComponentId: null,
      activePinId: null,
      pendingPinCoords: null,
      dragState: null,
    });
  },

  // --- Custom Tool actions (tab Strumenti) ---

  addCustomTool: () => {
    const id = generateId('ct');
    const newTool: DraftCustomTool = {
      id,
      name: '',
      description: '',
      imagePath: '',
      probes: [],
      outputType: 'none',
      outputUnit: '',
      modes: [],
    };
    set({ customTools: [...get().customTools, newTool], activeCustomToolId: id });
  },

  updateCustomTool: (id, updates) => {
    set({
      customTools: get().customTools.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  },

  deleteCustomTool: (id) => {
    set({
      customTools: get().customTools.filter(t => t.id !== id),
      activeCustomToolId: get().activeCustomToolId === id ? null : get().activeCustomToolId,
    });
  },

  selectCustomTool: (id) => set({ activeCustomToolId: id }),

  addProbeToTool: (toolId) => {
    const probeId = generateId('probe');
    const newProbe: DraftToolProbe = {
      id: probeId,
      label: '',
      role: '',
      color: '#6B7280',
      connectivity: 'all',
    };
    set({
      customTools: get().customTools.map(t =>
        t.id === toolId ? { ...t, probes: [...t.probes, newProbe] } : t
      ),
    });
  },

  updateProbe: (toolId, probeId, updates) => {
    set({
      customTools: get().customTools.map(t =>
        t.id === toolId
          ? { ...t, probes: t.probes.map(p => p.id === probeId ? { ...p, ...updates } : p) }
          : t
      ),
    });
  },

  deleteProbe: (toolId, probeId) => {
    set({
      customTools: get().customTools.map(t =>
        t.id === toolId
          ? { ...t, probes: t.probes.filter(p => p.id !== probeId) }
          : t
      ),
    });
  },

  addModeToTool: (toolId) => {
    const modeId = generateId('mode');
    const newMode: DraftToolMode = { id: modeId, name: '', shortName: '', unit: '' };
    set({
      customTools: get().customTools.map(t =>
        t.id === toolId ? { ...t, modes: [...t.modes, newMode] } : t
      ),
    });
  },

  updateMode: (toolId, modeId, updates) => {
    set({
      customTools: get().customTools.map(t =>
        t.id === toolId
          ? { ...t, modes: t.modes.map(m => m.id === modeId ? { ...m, ...updates } : m) }
          : t
      ),
    });
  },

  deleteMode: (toolId, modeId) => {
    set({
      customTools: get().customTools.map(t =>
        t.id === toolId
          ? { ...t, modes: t.modes.filter(m => m.id !== modeId) }
          : t
      ),
    });
  },

  uploadToolImage: async (toolId, file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/images/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        set({
          customTools: get().customTools.map(t =>
            t.id === toolId ? { ...t, imagePath: result.path } : t
          ),
        });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      return { success: false, error: message };
    }
  },
}));
