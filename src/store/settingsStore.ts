// src/store/settingsStore.ts
'use client';

import { create } from 'zustand';
import type {
  HardwareComponent, MeasurementPin, UartPin, UartRole, Exercise,
  ObjectiveType, PinCondition, PinLogic, BootStageCondition, ToolGroup,
  ToolConfig, MagnifierConfig, UartConnectorConfig, TerminalToolConfig,
  CompletionDialogConfig, FirmwareDumpPin, SpiRole, FirmwareDumpToolConfig,
} from '@/data/exercise';
import { SETTINGS_STORAGE_KEY, ALL_TOOLS, type Tool } from '@/data/exercise';
import type { CustomTool, ProbeConnectivity, ToolOutputType, FirmwareDumpConfig } from '@/types/custom-tool';

export type { ProbeConnectivity, ToolOutputType };

export type { PinCondition, PinLogic, ToolConfig, MagnifierConfig, UartConnectorConfig, TerminalToolConfig, CompletionDialogConfig };

// --- Draft types ---

export interface DraftObjective {
  id: string;
  name: string;
  type: ObjectiveType;
  componentId: string;
  customToolId: string; // per type='firmware-dump': ID del tool collegato
  terminalComponentId: string; // per type='terminal': ID del componente terminale
  pinConditions: PinCondition[];
  pinLogic: PinLogic;
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number]; // solo per type='component'
  bootStageConditions: BootStageCondition[];
  requiresUart: boolean;
  terminalPersistent: boolean;
  hintFiles: string[];
}

export interface DraftFirmwareDumpConfig {
  requiredConnections: Array<{ probeId: string; pinId: string }>;
  filePath: string;
  fileName: string;
  dumpDurationSec: number;
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

export type PinType = 'custom' | 'tx' | 'rx' | 'gnd' | 'vcc' | 'cs' | 'clk' | 'mosi' | 'miso';
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

export interface DraftFirmwareDumpPin {
  id: string;
  role: SpiRole;
  label: string;
  size: number;
  coords: [number, number];
}

export type SettingsTool = 'component' | 'pin' | 'objective' | 'terminal-config' | 'tools-config' | 'tool-config';

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
  probes: DraftToolProbe[];
  outputType: ToolOutputType;
  outputUnit: string;
  modes: DraftToolMode[];
  firmwareDumpConfig: DraftFirmwareDumpConfig;
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
  /** True when pin popup should be shown (explicit click to edit, not placement). */
  isEditingPin: boolean;
  pendingPinCoords: [number, number] | null;
  /** Selected (highlighted) pin/component from sidebar — separate from editing */
  selectedPinId: string | null;
  selectedComponentId: string | null;
  dragState: DragState | null;
  pcbImagePath: string;
  canvasZoom: number;
  canvasRotation: number;
  canvasPanX: number;
  canvasPanY: number;
  canvasPanMode: boolean;
  // Firmware dump pins (SPI pins on the PCB)
  firmwareDumpPins: DraftFirmwareDumpPin[];
  activeFirmwareDumpPinId: string | null;
  // Custom tools (tab Strumenti)
  customTools: DraftCustomTool[];
  activeCustomToolId: string | null;
  // Firmware
  firmwarePath: string;
  firmwareFileName: string;
  // Tool groups
  toolGroups: ToolGroup[];
  // Tool config (built-in tool configuration)
  toolConfig: ToolConfig;
  // Completion dialog config
  completionDialog: CompletionDialogConfig;
  completionDialogEnabled: boolean;
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
  addTerminalObjective: (stepId: string, terminalComponentId?: string) => void;
  addFirmwareDumpObjective: (stepId: string) => void;
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
  selectPin: (id: string | null) => void;
  selectComponent: (id: string | null) => void;

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
  updateFirmwareDumpConfig: (toolId: string, updates: Partial<DraftFirmwareDumpConfig>) => void;
  uploadFirmwareFile: (toolId: string, file: File) => Promise<{ success: boolean; path?: string; fileName?: string; error?: string }>;

  // Firmware (Init tab)
  uploadFirmware: (file: File) => Promise<{ success: boolean; path?: string; error?: string }>;
  deleteFirmware: () => void;

  // Tool groups
  addToolGroup: () => void;
  updateToolGroup: (id: string, updates: Partial<Omit<ToolGroup, 'id'>>) => void;
  deleteToolGroup: (id: string) => void;
  toggleToolInGroup: (groupId: string, toolId: string) => void;

  // Firmware dump pins (SPI pins on PCB)
  addFirmwareDumpPin: (role: SpiRole, coords: [number, number]) => void;
  updateFirmwareDumpPin: (id: string, updates: Partial<Omit<DraftFirmwareDumpPin, 'id'>>) => void;
  deleteFirmwareDumpPin: (id: string) => void;
  editFirmwareDumpPin: (id: string) => void;

  // Tool config (built-in tool configuration)
  updateMagnifierConfig: (updates: Partial<MagnifierConfig>) => void;
  updateUartConnectorConfig: (updates: Partial<UartConnectorConfig>) => void;
  updateTerminalToolConfig: (updates: Partial<TerminalToolConfig>) => void;
  updateFirmwareDumpToolConfig: (updates: Partial<FirmwareDumpToolConfig>) => void;
  toggleUartVisibleStep: (stepId: string) => void;
  updateCompletionDialog: (updates: Partial<CompletionDialogConfig>) => void;
  toggleCompletionDialog: () => void;
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
  isEditingPin: false,
  pendingPinCoords: null,
  selectedPinId: null,
  selectedComponentId: null,
  dragState: null,
  pcbImagePath: '',
  canvasZoom: 1,
  canvasRotation: 0,
  canvasPanX: 0,
  canvasPanY: 0,
  canvasPanMode: false,
  firmwareDumpPins: [],
  activeFirmwareDumpPinId: null,
  customTools: [],
  activeCustomToolId: null,
  firmwarePath: '',
  firmwareFileName: '',
  toolGroups: [],
  toolConfig: {
    magnifier: { defaultRadius: 120, defaultZoomLevel: 2.5 },
    uartConnector: { persistAfterConnection: false, visibleInSteps: [] },
    terminal: { requiresUart: true, persistent: false, bootStageConditions: [] },
  },
  completionDialog: {
    title: 'Exercise Completed!',
    description: 'Congratulations, you have successfully completed all objectives.',
    redirectUrl: '',
    redirectLabel: 'Next Exercise',
    downloadFilePath: '',
    downloadLabel: 'Download File',
    downloadFileName: '',
    showCopyFlag: true,
  },
  completionDialogEnabled: false,

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
      return { success: false, error: 'No image loaded' };
    }

    // Se non ci sono trasformazioni da applicare, return
    if (canvasZoom === 1 && canvasRotation === 0 && canvasPanX === 0 && canvasPanY === 0) {
      return { success: false, error: 'No transformations to apply' };
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
    const step = get().steps.find(s => s.id === stepId);
    if (!step) return;
    const has = step.availableTools.includes(tool);

    set({
      steps: get().steps.map(s => {
        if (s.id !== stepId) return s;
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
      customToolId: '',
      terminalComponentId: '',
      pinConditions: [],
      pinLogic: 'AND',
      instruction: '',
      hint: '',
      flagPart: '',
      coords: comp.coords,
      bootStageConditions: [],
      requiresUart: false,
      terminalPersistent: false,
      hintFiles: [],
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
      customToolId: '',
      terminalComponentId: '',
      pinConditions,
      pinLogic: logic,
      instruction: '',
      hint: '',
      flagPart: '',
      coords: [0, 0, 0, 0],
      bootStageConditions: [],
      requiresUart: false,
      terminalPersistent: false,
      hintFiles: [],
    };
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => [...objs, newObj]),
      activeObjectiveId: id,
      activeStepId: stepId,
    });
  },

  addTerminalObjective: (stepId, terminalComponentId) => {
    const id = generateId('obj');
    const newObj: DraftObjective = {
      id,
      name: 'Terminale',
      type: 'terminal',
      componentId: '',
      customToolId: '',
      terminalComponentId: terminalComponentId || '',
      pinConditions: [],
      pinLogic: 'AND',
      instruction: '',
      hint: '',
      flagPart: '',
      coords: [0, 0, 0, 0],
      bootStageConditions: [],
      requiresUart: true,
      terminalPersistent: false,
      hintFiles: [],
    };
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => [...objs, newObj]),
      activeObjectiveId: id,
      activeStepId: stepId,
    });
  },

  addFirmwareDumpObjective: (stepId) => {
    const id = generateId('obj');
    const newObj: DraftObjective = {
      id,
      name: 'Firmware Dump',
      type: 'firmware-dump',
      componentId: '',
      customToolId: '',
      terminalComponentId: '',
      pinConditions: [],
      pinLogic: 'AND',
      instruction: '',
      hint: '',
      flagPart: '',
      coords: [0, 0, 0, 0],
      bootStageConditions: [],
      requiresUart: false,
      terminalPersistent: false,
      hintFiles: [],
    };
    set({
      steps: updateStepObjectives(get().steps, stepId, objs => [...objs, newObj]),
      activeObjectiveId: id,
      activeStepId: stepId,
    });
  },

  deleteObjective: (stepId, objectiveId) => {
    const { activeObjectiveId, steps } = get();

    const newSteps = updateStepObjectives(steps, stepId, objs =>
      objs.filter(o => o.id !== objectiveId)
    );

    set({
      steps: newSteps,
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
      isEditingPin: false,
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
        isEditingPin: false,
        pendingPinCoords: null,
      });
    } else {
      set({ activePinId: null, isEditingPin: false, pendingPinCoords: null });
    }
  },

  savePin: (data) => {
    const { activePinId, pins } = get();
    if (!activePinId) return;
    set({
      pins: pins.map(p => p.id === activePinId ? { ...p, ...data } : p),
      activePinId: null,
      isEditingPin: false,
      pendingPinCoords: null,
    });
  },

  updatePin: (id, data) => {
    set({
      pins: get().pins.map(p => p.id === id ? { ...p, ...data } : p),
      activePinId: null,
      isEditingPin: false,
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
      isEditingPin: true,
      activeComponentId: null,
      activeObjectiveId: null,
      pendingPinCoords: pin.coords,
      selectedPinId: null,
      selectedComponentId: null,
    });
  },

  selectPin: (id) => {
    set({
      selectedPinId: id,
      selectedComponentId: null,
      // Don't touch activePinId/isEditingPin — selection ≠ editing
    });
  },

  selectComponent: (id) => {
    set({
      selectedComponentId: id,
      selectedPinId: null,
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
        ...(o.type === 'terminal' ? { requiresUart: o.requiresUart, terminalPersistent: o.terminalPersistent } : {}),
        ...(o.terminalComponentId ? { terminalComponentId: o.terminalComponentId } : {}),
        ...(o.type === 'firmware-dump' && o.customToolId ? { customToolId: o.customToolId } : {}),
        ...(o.hintFiles && o.hintFiles.length > 0 ? { hintFiles: o.hintFiles } : {}),
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

    // Only add step component-objectives that DON'T reference an existing init component
    // (objectives with componentId already point to an initComponent — no need to duplicate)
    const initIds = new Set(initComponents.map(c => c.id));
    const stepComponents: HardwareComponent[] = steps.flatMap(s =>
      s.objectives
        .filter(o => o.type === 'component' && !o.componentId && !initIds.has(o.id))
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

    const UART_PIN_TYPES = ['tx', 'rx', 'gnd', 'vcc'];
    const SPI_PIN_TYPES = ['cs', 'clk', 'mosi', 'miso', 'gnd', 'vcc'];

    const uartPins: UartPin[] = pins
      .filter(p => UART_PIN_TYPES.includes(p.pinType))
      .map(p => ({
        id: p.id,
        role: p.pinType as UartRole,
        label: p.label,
        coords: [p.coords[0] - p.size / 2, p.coords[1] - p.size / 2, p.size, p.size] as [number, number, number, number],
      }));

    // Collect pin IDs referenced by firmware-dump pinConditions (fw-probe:*)
    const fwPinIds = new Set<string>();
    for (const s of steps) {
      for (const o of s.objectives) {
        if (o.pinConditions) {
          for (const c of o.pinConditions) {
            if (c.terminal.startsWith('fw-probe:')) fwPinIds.add(c.pinId);
          }
        }
      }
    }

    // Export only pins actually referenced by firmware dump objectives
    const spiPinsFromDraft: FirmwareDumpPin[] = pins
      .filter(p => fwPinIds.has(p.id))
      .map(p => ({
        id: p.id,
        role: p.pinType as SpiRole,
        label: p.label || p.pinType.toUpperCase(),
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
        probes: t.probes,
        outputType: t.outputType,
        ...(t.outputUnit ? { outputUnit: t.outputUnit } : {}),
        ...(t.modes.length > 0 ? { modes: t.modes } : {}),
        ...(t.outputType === 'firmware-dump' ? { firmwareDumpConfig: {
          requiredConnections: t.firmwareDumpConfig.requiredConnections,
          ...(t.firmwareDumpConfig.filePath ? { filePath: t.firmwareDumpConfig.filePath } : {}),
          ...(t.firmwareDumpConfig.fileName ? { fileName: t.firmwareDumpConfig.fileName } : {}),
          dumpDurationSec: t.firmwareDumpConfig.dumpDurationSec,
        } } : {}),
      }));

    const { firmwarePath, firmwareDumpPins: draftFwPins } = get();

    // Export firmware dump pins: merge from dedicated DraftFirmwareDumpPin + SPI DraftPins
    const fwPinsFromDedicated: FirmwareDumpPin[] = draftFwPins.map(p => ({
      id: p.id,
      role: p.role,
      label: p.label,
      coords: [p.coords[0] - p.size / 2, p.coords[1] - p.size / 2, p.size, p.size] as [number, number, number, number],
    }));
    // Merge, deduplicating by ID (DraftPin SPI pins take priority)
    const existingIds = new Set(spiPinsFromDraft.map(p => p.id));
    const fwDumpPins = [...spiPinsFromDraft, ...fwPinsFromDedicated.filter(p => !existingIds.has(p.id))];

    const exercise: Exercise = {
      pcbImage: pcbImagePath,
      steps: exportSteps,
      components: hardwareComponents,
      pins: measurementPins,
      uartPins,
      initialFlag: `flag{${'?'.repeat(firstStepFlagLen)}}`,
      ...(exportedCustomTools.length > 0 ? { customTools: exportedCustomTools } : {}),
      ...(firmwarePath ? { firmwarePath } : {}),
      ...(fwDumpPins.length > 0 ? { firmwareDumpPins: fwDumpPins } : {}),
      ...(get().toolGroups.length > 0 ? { toolGroups: get().toolGroups } : {}),
      toolConfig: get().toolConfig,
      ...(get().completionDialogEnabled ? { completionDialog: get().completionDialog } : {}),
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
          firmwareDumpPins: [],
          activeFirmwareDumpPinId: null,
          customTools: [],
          activeCustomToolId: null,
          firmwarePath: '',
          firmwareFileName: '',
          toolGroups: [],
          toolConfig: {
            magnifier: { defaultRadius: 120, defaultZoomLevel: 2.5 },
            uartConnector: { persistAfterConnection: false, visibleInSteps: [] },
            terminal: { requiresUart: true, persistent: false, bootStageConditions: [] },
          },
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
                customToolId: (o as any).customToolId || '',
                terminalComponentId: (o as any).terminalComponentId || '',
                requiresUart: (o as any).requiresUart ?? (o.type === 'terminal'),
                terminalPersistent: (o as any).terminalPersistent ?? false,
                hintFiles: (o as any).hintFiles || [],
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
            customToolId: '',
            terminalComponentId: '',
            pinConditions: [],
            pinLogic: 'AND' as PinLogic,
            instruction: c.instruction,
            hint: c.hint,
            flagPart: c.flagPart,
            coords: c.coords,
            bootStageConditions: [],
            requiresUart: false,
            terminalPersistent: false,
            hintFiles: [],
          })),
        }];
      }

      // Converti pin — preserve original IDs from the preset so that
      // pinConditions (which reference these IDs) remain valid after import.
      const mPins: DraftPin[] = (exercise.pins || []).map((p, i) => {
        const id = p.id || `pin-m-${i + 1}`;
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
        const id = p.id || `pin-u-${i + 1}`;
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

      // Converti firmwareDumpPins → DraftFirmwareDumpPin[] (legacy) + DraftPin[] (unified)
      const draftFwPins: DraftFirmwareDumpPin[] = (exercise.firmwareDumpPins ?? []).map((p, i) => {
        const [left, top, width, height] = p.coords;
        return {
          id: p.id || `fw-pin-${i + 1}`,
          role: p.role,
          label: p.label,
          size: Math.max(width, height),
          coords: [left + width / 2, top + height / 2] as [number, number],
        };
      });

      // Also import firmwareDumpPins into the unified DraftPin system (like UART pins)
      const SPI_DEFAULTS: Record<string, { v: number; r: number }> = {
        vcc: { v: 3.3, r: 0 }, gnd: { v: 0, r: 0 },
        cs: { v: 3.3, r: 10000 }, clk: { v: 0, r: 50 },
        mosi: { v: 0, r: 50 }, miso: { v: 0, r: 50 },
      };
      const spiPins: DraftPin[] = (exercise.firmwareDumpPins ?? []).map((p, i) => {
        const id = p.id || `pin-spi-${i + 1}`;
        const [left, top, width, height] = p.coords;
        const d = SPI_DEFAULTS[p.role] || { v: 0, r: 0 };
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
        firmwareDumpConfig: t.outputType === 'firmware-dump' && (t as any).firmwareDumpConfig
          ? {
              requiredConnections: (t as any).firmwareDumpConfig.requiredConnections ?? [],
              filePath: (t as any).firmwareDumpConfig.filePath ?? '',
              fileName: (t as any).firmwareDumpConfig.fileName ?? '',
              dumpDurationSec: (t as any).firmwareDumpConfig.dumpDurationSec ?? 3,
            }
          : { requiredConnections: [], filePath: '', fileName: '', dumpDurationSec: 3 },
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
        pins: (() => {
          // Deduplicate: UART pins take precedence over SPI pins with the same ID
          // (GND/VCC pins can appear in both uartPins and firmwareDumpPins)
          const seen = new Set([...mPins, ...uPins].map(p => p.id));
          return [...mPins, ...uPins, ...spiPins.filter(p => !seen.has(p.id))];
        })(),
        activePinId: null,
        pendingPinCoords: null,
        dragState: null,
        pcbImagePath: exercise.pcbImage || '',
        canvasZoom: 1,
        canvasRotation: 0,
        canvasPanX: 0,
        canvasPanY: 0,
        canvasPanMode: false,
        firmwareDumpPins: draftFwPins,
        activeFirmwareDumpPinId: null,
        customTools: draftCustomTools,
        activeCustomToolId: null,
        firmwarePath: exercise.firmwarePath || '',
        firmwareFileName: exercise.firmwarePath ? exercise.firmwarePath.split('/').pop() || '' : '',
        toolGroups: exercise.toolGroups ?? [],
        toolConfig: {
          magnifier: {
            defaultRadius: exercise.toolConfig?.magnifier?.defaultRadius ?? 120,
            defaultZoomLevel: exercise.toolConfig?.magnifier?.defaultZoomLevel ?? 2.5,
          },
          uartConnector: {
            persistAfterConnection: exercise.toolConfig?.uartConnector?.persistAfterConnection ?? false,
            visibleInSteps: exercise.toolConfig?.uartConnector?.visibleInSteps ?? [],
            ...(exercise.toolConfig?.uartConnector?.terminalComponentId ? { terminalComponentId: exercise.toolConfig.uartConnector.terminalComponentId } : {}),
          },
          terminal: {
            requiresUart: exercise.toolConfig?.terminal?.requiresUart ?? true,
            persistent: exercise.toolConfig?.terminal?.persistent ?? false,
            bootStageConditions: exercise.toolConfig?.terminal?.bootStageConditions ?? [],
          },
          ...(exercise.toolConfig?.firmwareDump ? { firmwareDump: exercise.toolConfig.firmwareDump } : {}),
        },
        completionDialog: {
          title: exercise.completionDialog?.title ?? 'Exercise Completed!',
          description: exercise.completionDialog?.description ?? 'Congratulations, you have successfully completed all objectives.',
          redirectUrl: exercise.completionDialog?.redirectUrl ?? '',
          redirectLabel: exercise.completionDialog?.redirectLabel ?? 'Next Exercise',
          downloadFilePath: exercise.completionDialog?.downloadFilePath ?? '',
          downloadLabel: exercise.completionDialog?.downloadLabel ?? 'Download File',
          downloadFileName: exercise.completionDialog?.downloadFileName ?? '',
          showCopyFlag: exercise.completionDialog?.showCopyFlag ?? true,
        },
        completionDialogEnabled: !!exercise.completionDialog,
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
        return { success: true, message: 'Configuration loaded successfully' };
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
      firmwareDumpPins: [],
      activeFirmwareDumpPinId: null,
      customTools: [],
      activeCustomToolId: null,
      firmwarePath: '',
      firmwareFileName: '',
      toolGroups: [],
      toolConfig: {
        magnifier: { defaultRadius: 120, defaultZoomLevel: 2.5 },
        uartConnector: { persistAfterConnection: false, visibleInSteps: [] },
        terminal: { requiresUart: true, persistent: false, bootStageConditions: [] },
      },
      completionDialog: {
        title: 'Exercise Completed!',
        description: 'Congratulations, you have successfully completed all objectives.',
        redirectUrl: '',
        redirectLabel: 'Next Exercise',
        downloadFilePath: '',
        downloadLabel: 'Download File',
        downloadFileName: '',
        showCopyFlag: true,
      },
      completionDialogEnabled: false,
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
      probes: [],
      outputType: 'none',
      outputUnit: '',
      modes: [],
      firmwareDumpConfig: { requiredConnections: [], filePath: '', fileName: '', dumpDurationSec: 3 },
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

  updateFirmwareDumpConfig: (toolId, updates) => {
    set({
      customTools: get().customTools.map(t =>
        t.id === toolId ? { ...t, firmwareDumpConfig: { ...t.firmwareDumpConfig, ...updates } } : t
      ),
    });
  },

  uploadFirmwareFile: async (toolId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/firmware/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        set({
          customTools: get().customTools.map(t =>
            t.id === toolId
              ? { ...t, firmwareDumpConfig: { ...t.firmwareDumpConfig, filePath: result.path, fileName: result.fileName } }
              : t
          ),
        });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      return { success: false, error: message };
    }
  },

  // --- Firmware (Init tab) ---

  uploadFirmware: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/firmware/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        set({ firmwarePath: result.path, firmwareFileName: result.fileName });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      return { success: false, error: message };
    }
  },

  deleteFirmware: () => {
    set({ firmwarePath: '', firmwareFileName: '' });
  },

  // --- Tool Groups ---

  addToolGroup: () => {
    const id = generateId('tg');
    set({ toolGroups: [...get().toolGroups, { id, name: 'Nuovo gruppo', toolIds: [] }] });
  },

  updateToolGroup: (id, updates) => {
    set({ toolGroups: get().toolGroups.map(g => g.id === id ? { ...g, ...updates } : g) });
  },

  deleteToolGroup: (id) => {
    set({ toolGroups: get().toolGroups.filter(g => g.id !== id) });
  },

  toggleToolInGroup: (groupId, toolId) => {
    set({
      toolGroups: get().toolGroups.map(g => {
        if (g.id !== groupId) return g;
        const has = g.toolIds.includes(toolId);
        return { ...g, toolIds: has ? g.toolIds.filter(t => t !== toolId) : [...g.toolIds, toolId] };
      }),
    });
  },

  // --- Tool config (built-in tool configuration) ---

  updateMagnifierConfig: (updates) => {
    const { toolConfig } = get();
    set({
      toolConfig: {
        ...toolConfig,
        magnifier: { ...toolConfig.magnifier!, ...updates },
      },
    });
  },

  updateUartConnectorConfig: (updates) => {
    const { toolConfig } = get();
    set({
      toolConfig: {
        ...toolConfig,
        uartConnector: { ...toolConfig.uartConnector!, ...updates },
      },
    });
  },

  updateTerminalToolConfig: (updates) => {
    const { toolConfig } = get();
    set({
      toolConfig: {
        ...toolConfig,
        terminal: { ...toolConfig.terminal!, ...updates },
      },
    });
  },

  toggleUartVisibleStep: (stepId) => {
    const { toolConfig } = get();
    const current = toolConfig.uartConnector?.visibleInSteps ?? [];
    const has = current.includes(stepId);
    set({
      toolConfig: {
        ...toolConfig,
        uartConnector: {
          ...toolConfig.uartConnector!,
          visibleInSteps: has ? current.filter(s => s !== stepId) : [...current, stepId],
        },
      },
    });
  },

  // --- Firmware dump pins ---

  addFirmwareDumpPin: (role, coords) => {
    const SPI_LABELS: Record<SpiRole, string> = {
      vcc: 'VCC', gnd: 'GND', cs: 'CS', clk: 'CLK', mosi: 'MOSI', miso: 'MISO',
    };
    const pin: DraftFirmwareDumpPin = {
      id: generateId('fw-pin'),
      role,
      label: SPI_LABELS[role],
      size: 2,
      coords,
    };
    set({ firmwareDumpPins: [...get().firmwareDumpPins, pin], activeFirmwareDumpPinId: pin.id });
  },

  updateFirmwareDumpPin: (id, updates) => {
    set({
      firmwareDumpPins: get().firmwareDumpPins.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  },

  deleteFirmwareDumpPin: (id) => {
    set({
      firmwareDumpPins: get().firmwareDumpPins.filter(p => p.id !== id),
      activeFirmwareDumpPinId: get().activeFirmwareDumpPinId === id ? null : get().activeFirmwareDumpPinId,
    });
  },

  editFirmwareDumpPin: (id) => {
    set({ activeFirmwareDumpPinId: id });
  },

  updateFirmwareDumpToolConfig: (updates) => {
    const { toolConfig } = get();
    const current = toolConfig.firmwareDump ?? {
      probes: [], requiredConnections: [], filePath: '', fileName: '', dumpDurationSec: 3,
    };
    set({
      toolConfig: {
        ...toolConfig,
        firmwareDump: { ...current, ...updates },
      },
    });
  },

  updateCompletionDialog: (updates) => {
    set({
      completionDialog: { ...get().completionDialog, ...updates },
    });
  },

  toggleCompletionDialog: () => {
    set({ completionDialogEnabled: !get().completionDialogEnabled });
  },
}));
