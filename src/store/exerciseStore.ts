// src/store/exerciseStore.ts

import { create } from 'zustand';
import { exerciseData } from '@/data/exercise';

export type Tool = 'pointer' | 'magnifier' | 'multimeter';
export type MultimeterMode = 'V' | 'Ohm';

interface MousePosition { x: number; y: number; }
interface ProbeState { hookedTo: string | null; }

interface ExerciseState {
  currentStep: number;
  foundComponents: string[];
  flag: string;
  isFinished: boolean;
  activeTool: Tool;
  mousePosition: MousePosition | null;
  measuredComponentId: string | null;
  multimeterMode: MultimeterMode;
  activeProbe: 'first' | 'second' | null;
  probe1: ProbeState;
  probe2: ProbeState;
  snapTarget: string | null;
}

interface ExerciseActions {
  selectComponent: (componentId: string) => void;
  resetExercise: () => void;
  setActiveTool: (tool: Tool) => void;
  updateMousePosition: (position: MousePosition | null) => void;
  measureComponent: (componentId: string) => void;
  clearMeasurement: () => void;
  setMultimeterMode: (mode: MultimeterMode) => void;
  setSnapTarget: (pinId: string | null) => void;
  hookProbe: () => void;
  unhookProbe: (probeNumber: 'first' | 'second') => void;
}

type ExerciseStore = ExerciseState & ExerciseActions;

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  // Stato iniziale
  currentStep: 0,
  foundComponents: [],
  flag: exerciseData.initialFlag,
  isFinished: false,
  activeTool: 'pointer',
  mousePosition: null,
  measuredComponentId: null,
  multimeterMode: 'V',
  activeProbe: null,
  probe1: { hookedTo: null },
  probe2: { hookedTo: null },
  snapTarget: null,

  // Azioni
  resetExercise: () => set({
    currentStep: 0,
    foundComponents: [],
    flag: exerciseData.initialFlag,
    isFinished: false,
    activeTool: 'pointer',
    mousePosition: null,
    measuredComponentId: null,
    multimeterMode: 'V',
    activeProbe: null,
    probe1: { hookedTo: null },
    probe2: { hookedTo: null },
    snapTarget: null,
  }),
  
  // =========================================================================
  // ===                     MODIFICA CHIAVE QUI                           ===
  // =========================================================================
  setActiveTool: (tool) => {
    // Prima di tutto, imposta lo strumento attivo
    set({ activeTool: tool });

    // Nasconde la lente se non è il tool attivo
    if (tool !== 'magnifier') {
      set({ mousePosition: null });
    }
    
    // Se lo strumento selezionato NON è il multimetro,
    // esegui una pulizia completa dello stato del multimetro.
    if (tool !== 'multimeter') {
      set({
        activeProbe: null,
        probe1: { hookedTo: null },
        probe2: { hookedTo: null },
        snapTarget: null,
      });
    } else {
      // Se invece si ATTIVA il multimetro, prepariamo il primo puntale
      // (solo se non era già agganciato).
      if (!get().probe1.hookedTo) {
        set({ activeProbe: 'first' });
      }
    }
  },
  // =========================================================================
  
  updateMousePosition: (position) => set({ mousePosition: position }),
  measureComponent: (componentId) => set({ measuredComponentId: componentId }),
  clearMeasurement: () => set({ measuredComponentId: null }),
  setMultimeterMode: (mode) => set({ multimeterMode: mode }),
  setSnapTarget: (pinId) => set({ snapTarget: pinId }),
  
  unhookProbe: (probeNumber) => {
    if (probeNumber === 'first') {
      set({ probe1: { hookedTo: null }, probe2: { hookedTo: null }, activeProbe: 'first', snapTarget: null });
    } else {
      set({ probe2: { hookedTo: null }, activeProbe: 'second', snapTarget: null });
    }
  },
  
  hookProbe: () => {
    const { activeProbe, snapTarget, probe1 } = get();
    if (!activeProbe || !snapTarget) return;

    if (activeProbe === 'first') {
      set({
        probe1: { hookedTo: snapTarget },
        activeProbe: 'second',
        snapTarget: null,
      });
    } else {
      if (snapTarget === probe1.hookedTo) return;
      set({
        probe2: { hookedTo: snapTarget },
        activeProbe: null,
        snapTarget: null,
      });
    }
  },
  
  selectComponent: (componentId) => {
    const { currentStep, foundComponents, isFinished } = get();
    if (isFinished) return;
    const correctComponent = exerciseData.components[currentStep];
    if (correctComponent && componentId === correctComponent.id) {
      const newFoundComponents = [...foundComponents, componentId];
      let newFlag = exerciseData.initialFlag;
      let revealedPart = '';
      newFoundComponents.forEach(id => {
        const part = exerciseData.components.find(c => c.id === id)?.flagPart || '';
        revealedPart += part;
      });
      newFlag = `flag{${revealedPart}}`;
      const exerciseIsNowFinished = newFoundComponents.length === exerciseData.components.length;
      set({
        currentStep: currentStep + 1,
        foundComponents: newFoundComponents,
        flag: newFlag,
        isFinished: exerciseIsNowFinished,
      });
    }
  },
}));