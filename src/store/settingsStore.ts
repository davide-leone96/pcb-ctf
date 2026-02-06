// src/store/settingsStore.ts
'use client';

import { create } from 'zustand';
import type { HardwareComponent, MeasurementPin, UartPin, UartRole, Exercise } from '@/data/exercise';
import { SETTINGS_STORAGE_KEY } from '@/data/exercise';

// --- Draft types (editable versions of the exercise types) ---

export interface DraftComponent {
  id: string;
  name: string;
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number]; // [left%, top%, width%, height%]
}

export type PinType = 'custom' | 'tx' | 'rx' | 'gnd' | 'vcc';
export type PinShape = 'circle' | 'square';
export type ValueMode = 'fixed' | 'range';

export interface DraftPin {
  id: string;
  pinType: PinType;
  label: string;
  shape: PinShape;
  size: number; // percentage width/height
  coords: [number, number]; // [left%, top%] center point
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

export type SettingsTool = 'component' | 'pin';

export interface DragState {
  startX: number; // percentage
  startY: number;
  currentX: number;
  currentY: number;
}

// --- Store types ---

interface SettingsState {
  activeTool: SettingsTool;
  components: DraftComponent[];
  pins: DraftPin[];
  dragState: DragState | null;
  activeComponentId: string | null; // editing / just created
  activePinId: string | null; // editing / just created
  pendingPinCoords: [number, number] | null; // pin placement before save
  pcbImagePath: string;
}

interface SettingsActions {
  setActiveTool: (tool: SettingsTool) => void;
  setPcbImagePath: (path: string) => void;

  // Component actions
  startDrag: (x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
  cancelComponentEdit: () => void;
  saveComponent: (data: Omit<DraftComponent, 'id' | 'coords'>) => void;
  updateComponent: (id: string, data: Partial<Omit<DraftComponent, 'id' | 'coords'>>) => void;
  deleteComponent: (id: string) => void;
  editComponent: (id: string) => void;

  // Pin actions
  placePin: (x: number, y: number) => void;
  movePinCoords: (x: number, y: number) => void;
  cancelPinEdit: () => void;
  savePin: (data: Omit<DraftPin, 'id' | 'coords'>) => void;
  updatePin: (id: string, data: Partial<Omit<DraftPin, 'id' | 'coords'>>) => void;
  deletePin: (id: string) => void;
  editPin: (id: string) => void;

  // Export, Apply & Load
  exportAsJson: () => string;
  exportAsTypeScript: () => string;
  applyConfig: () => void;
  loadFromStorage: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

let componentCounter = 0;
let pinCounter = 0;

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

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state
  activeTool: 'component',
  components: [],
  pins: [],
  dragState: null,
  activeComponentId: null,
  activePinId: null,
  pendingPinCoords: null,
  pcbImagePath: '/images/pcb_v2.jpg',

  // Tool
  setActiveTool: (tool) => {
    const state = get();
    // Cancel any pending edits when switching tools
    if (state.dragState || state.activeComponentId) {
      // If there's an unsaved new component, remove it
      const comp = state.components.find(c => c.id === state.activeComponentId);
      if (comp && comp.name === '') {
        set({ components: state.components.filter(c => c.id !== state.activeComponentId) });
      }
    }
    if (state.pendingPinCoords || state.activePinId) {
      const pin = state.pins.find(p => p.id === state.activePinId);
      if (pin && pin.label === '') {
        set({ pins: state.pins.filter(p => p.id !== state.activePinId) });
      }
    }
    set({
      activeTool: tool,
      dragState: null,
      activeComponentId: null,
      activePinId: null,
      pendingPinCoords: null,
    });
  },

  setPcbImagePath: (path) => set({ pcbImagePath: path }),

  // --- Component actions ---

  startDrag: (x, y) => {
    const state = get();
    // Cancel any current component edit
    if (state.activeComponentId) {
      const comp = state.components.find(c => c.id === state.activeComponentId);
      if (comp && comp.name === '') {
        set({ components: state.components.filter(c => c.id !== state.activeComponentId) });
      }
    }
    set({
      dragState: { startX: x, startY: y, currentX: x, currentY: y },
      activeComponentId: null,
    });
  },

  updateDrag: (x, y) => {
    const { dragState } = get();
    if (!dragState) return;
    set({ dragState: { ...dragState, currentX: x, currentY: y } });
  },

  endDrag: () => {
    const { dragState, components } = get();
    if (!dragState) return;
    const coords = dragToCoords(dragState);
    // Min threshold: 1% width and 1% height
    if (coords[2] < 1 || coords[3] < 1) {
      set({ dragState: null });
      return;
    }
    const id = `comp-${++componentCounter}`;
    const newComponent: DraftComponent = {
      id,
      name: '',
      instruction: '',
      hint: '',
      flagPart: '',
      coords,
    };
    set({
      components: [...components, newComponent],
      dragState: null,
      activeComponentId: id,
    });
  },

  cancelComponentEdit: () => {
    const { activeComponentId, components } = get();
    if (!activeComponentId) return;
    const comp = components.find(c => c.id === activeComponentId);
    // Remove if it was never saved (name is empty)
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
      components: components.map(c =>
        c.id === activeComponentId ? { ...c, ...data } : c
      ),
      activeComponentId: null,
    });
  },

  updateComponent: (id, data) => {
    const { components } = get();
    set({
      components: components.map(c => c.id === id ? { ...c, ...data } : c),
      activeComponentId: null,
    });
  },

  deleteComponent: (id) => {
    set({
      components: get().components.filter(c => c.id !== id),
      activeComponentId: get().activeComponentId === id ? null : get().activeComponentId,
    });
  },

  editComponent: (id) => {
    set({ activeComponentId: id, activePinId: null, pendingPinCoords: null });
  },

  // --- Pin actions ---

  placePin: (x, y) => {
    const state = get();
    // Cancel current pin edit if unsaved
    if (state.activePinId) {
      const pin = state.pins.find(p => p.id === state.activePinId);
      if (pin && pin.label === '') {
        set({ pins: state.pins.filter(p => p.id !== state.activePinId) });
      }
    }
    const id = `pin-${++pinCounter}`;
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
      pendingPinCoords: pin.coords,
    });
  },

  // --- Export ---

  exportAsJson: () => {
    const { components, pins, pcbImagePath } = get();

    const hardwareComponents: HardwareComponent[] = components.map(c => ({
      id: c.id,
      name: c.name,
      instruction: c.instruction,
      hint: c.hint,
      flagPart: c.flagPart || c.name.toUpperCase().replace(/\s+/g, '_'),
      coords: c.coords,
    }));

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

    const flagParts = hardwareComponents.map(c => c.flagPart).join('');
    const exercise: Exercise = {
      pcbImage: pcbImagePath,
      components: hardwareComponents,
      pins: measurementPins,
      uartPins,
      initialFlag: `flag{${'?'.repeat(flagParts.length || 20)}}`,
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
      if (!saved) return;
      const exercise = JSON.parse(saved) as Exercise;

      // Converti HardwareComponent[] → DraftComponent[]
      const components: DraftComponent[] = exercise.components.map((c, i) => {
        const id = `comp-${i + 1}`;
        componentCounter = Math.max(componentCounter, i + 1);
        return { id, name: c.name, instruction: c.instruction, hint: c.hint, flagPart: c.flagPart, coords: c.coords };
      });

      // Converti MeasurementPin[] → DraftPin[] (custom)
      const mPins: DraftPin[] = exercise.pins.map((p, i) => {
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

      // Converti UartPin[] → DraftPin[] (uart types)
      const uPins: DraftPin[] = exercise.uartPins.map((p, i) => {
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

      pinCounter = mPins.length + uPins.length;

      set({
        components,
        pins: [...mPins, ...uPins],
        pcbImagePath: exercise.pcbImage,
        activeComponentId: null,
        activePinId: null,
        pendingPinCoords: null,
        dragState: null,
      });
    } catch { /* ignore invalid data */ }
  },
}));
