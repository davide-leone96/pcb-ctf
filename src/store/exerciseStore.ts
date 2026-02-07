// src/store/exerciseStore.ts

import { create } from 'zustand';
import { exerciseData } from '@/data/exercise';

export type Tool = 'pointer' | 'magnifier' | 'multimeter' | 'probes' | 'terminal';
export type MultimeterMode = 'V' | 'Ohm';
export type AdapterPin = 'adapter-tx' | 'adapter-rx' | 'adapter-gnd';

interface MousePosition { x: number; y: number; }
interface ProbeState { hookedTo: string | null; }
interface UartConnection { adapterPin: AdapterPin; pcbPinId: string | null; }

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
  terminalDiscoveries: string[];
  uartConnections: UartConnection[];
  activeAdapterPin: AdapterPin | null;
  uartSnapTarget: string | null;
  uartConnected: boolean;
  lensRadius: number;
  lensZoomLevel: number;
  lensVisible: boolean;
  lensIsAnchored: boolean;
  lensAnchorPosition: MousePosition | null;
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
  addTerminalDiscovery: (id: string) => void;
  selectAdapterPin: (pin: AdapterPin) => void;
  setUartSnapTarget: (pinId: string | null) => void;
  hookUartProbe: () => void;
  unhookUartProbe: (adapterPin: AdapterPin) => void;
  setLensRadius: (radius: number) => void;
  setLensZoomLevel: (zoom: number) => void;
  toggleLensVisible: () => void;
  toggleLensAnchor: () => void;
  setLensAnchorPosition: (position: MousePosition | null) => void;
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
  terminalDiscoveries: [],
  uartConnections: [
    { adapterPin: 'adapter-tx', pcbPinId: null },
    { adapterPin: 'adapter-rx', pcbPinId: null },
    { adapterPin: 'adapter-gnd', pcbPinId: null },
  ],
  activeAdapterPin: null,
  uartSnapTarget: null,
  uartConnected: false,
  lensRadius: 120,
  lensZoomLevel: 2.5,
  lensVisible: false,
  lensIsAnchored: false,
  lensAnchorPosition: null,

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
    uartConnections: [
      { adapterPin: 'adapter-tx', pcbPinId: null },
      { adapterPin: 'adapter-rx', pcbPinId: null },
      { adapterPin: 'adapter-gnd', pcbPinId: null },
    ],
    activeAdapterPin: null,
    uartSnapTarget: null,
    uartConnected: false,
  }),
  
  // =========================================================================
  // ===                     MODIFICA CHIAVE QUI                           ===
  // =========================================================================
  setActiveTool: (tool) => {
    const { lensVisible, lensIsAnchored } = get();

    // Prima di tutto, imposta lo strumento attivo
    set({ activeTool: tool });

    // Se la lente è visibile ma NON ancorata, e si seleziona un tool diverso da pointer,
    // disattiva automaticamente la lente
    if (lensVisible && !lensIsAnchored && tool !== 'pointer') {
      set({ lensVisible: false });
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

    // Pulisci lo stato transitorio delle sonde UART quando si cambia tool
    // (ma mantieni le connessioni e lo stato uartConnected)
    if (tool !== 'probes') {
      set({ activeAdapterPin: null, uartSnapTarget: null });
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
      // Se sgancio il primo puntale (rosso), devo sganciare anche il secondo (nero)
      // e rendere il primo di nuovo attivo.
      set({ 
        probe1: { hookedTo: null }, 
        probe2: { hookedTo: null }, // Sgancia anche il nero
        activeProbe: 'first', 
        snapTarget: null 
      });
    } else { // 'second'
      // Se sgancio solo il secondo (nero), il primo rimane agganciato
      // e il secondo diventa attivo.
      set({ 
        probe2: { hookedTo: null }, 
        activeProbe: 'second', 
        snapTarget: null 
      });
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
  
  addTerminalDiscovery: (id) => {
    const { terminalDiscoveries } = get();
    if (!terminalDiscoveries.includes(id)) {
      set({ terminalDiscoveries: [...terminalDiscoveries, id] });
    }
  },

  selectAdapterPin: (pin) => {
    const { activeAdapterPin, uartConnections } = get();
    // Se clicco lo stesso pin già attivo, deseleziona
    if (activeAdapterPin === pin) {
      set({ activeAdapterPin: null, uartSnapTarget: null });
      return;
    }
    // Se il pin è già connesso, scollegalo prima
    const conn = uartConnections.find(c => c.adapterPin === pin);
    if (conn?.pcbPinId) {
      const updated = uartConnections.map(c =>
        c.adapterPin === pin ? { ...c, pcbPinId: null } : c
      );
      set({ uartConnections: updated, uartConnected: false });
    }
    set({ activeAdapterPin: pin, uartSnapTarget: null });
  },

  setUartSnapTarget: (pinId) => set({ uartSnapTarget: pinId }),

  hookUartProbe: () => {
    const { activeAdapterPin, uartSnapTarget, uartConnections } = get();
    if (!activeAdapterPin || !uartSnapTarget) return;

    // Impedisci di collegare due adapter pin allo stesso PCB pin
    const alreadyUsed = uartConnections.find(
      c => c.pcbPinId === uartSnapTarget && c.adapterPin !== activeAdapterPin
    );
    if (alreadyUsed) return;

    const updated = uartConnections.map(c =>
      c.adapterPin === activeAdapterPin ? { ...c, pcbPinId: uartSnapTarget } : c
    );

    // Valida automaticamente dopo ogni connessione
    const correctMapping: Record<AdapterPin, string> = {
      'adapter-tx': 'rx',
      'adapter-rx': 'tx',
      'adapter-gnd': 'gnd',
    };
    const allCorrect = updated.every(conn => {
      if (!conn.pcbPinId) return false;
      const pin = exerciseData.uartPins.find(p => p.id === conn.pcbPinId);
      if (!pin) return false;
      return pin.role === correctMapping[conn.adapterPin];
    });

    set({
      uartConnections: updated,
      activeAdapterPin: null,
      uartSnapTarget: null,
      uartConnected: allCorrect,
    });
  },

  unhookUartProbe: (adapterPin) => {
    const { uartConnections } = get();
    const updated = uartConnections.map(c =>
      c.adapterPin === adapterPin ? { ...c, pcbPinId: null } : c
    );
    set({ uartConnections: updated, uartConnected: false });
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

  setLensRadius: (radius) => set({ lensRadius: Math.max(50, Math.min(200, radius)) }),
  setLensZoomLevel: (zoom) => set({ lensZoomLevel: Math.max(1.5, Math.min(5, zoom)) }),
  toggleLensVisible: () => {
    const { lensVisible } = get();
    if (lensVisible) {
      set({ lensVisible: false, lensIsAnchored: false, lensAnchorPosition: null });
    } else {
      set({ lensVisible: true });
    }
  },
  toggleLensAnchor: () => {
    const { lensIsAnchored, mousePosition } = get();
    if (lensIsAnchored) {
      set({ lensIsAnchored: false, lensAnchorPosition: null });
    } else {
      set({ lensIsAnchored: true, lensAnchorPosition: mousePosition });
    }
  },
  setLensAnchorPosition: (position) => set({ lensAnchorPosition: position }),
}));