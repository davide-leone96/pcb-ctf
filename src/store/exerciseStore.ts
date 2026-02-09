// src/store/exerciseStore.ts

import { create } from 'zustand';
import type { Exercise } from '@/data/exercise';

export type Tool = 'pointer' | 'magnifier' | 'multimeter' | 'probes' | 'terminal';
export type MultimeterMode = 'V' | 'Ohm';
export type AdapterPin = 'adapter-tx' | 'adapter-rx' | 'adapter-gnd';
export type StepMode = 'education' | 'active' | 'completed';

export interface MousePosition { x: number; y: number; }
export interface ProbeState { hookedTo: string | null; }
export interface UartConnection { adapterPin: AdapterPin; pcbPinId: string | null; }

interface ExerciseState {
  // Step management
  exerciseData: Exercise | null;
  currentStepIndex: number;
  currentObjectiveIndex: number;
  stepMode: StepMode;
  isSimulatorEnabled: boolean;

  // Legacy (kept for compatibility)
  currentStep: number;
  foundComponents: string[];
  flag: string;
  uartFlag: string;
  isFinished: boolean;
  activeTool: Tool;
  multimeterUnlocked: boolean;
  uartUnlocked: boolean;
  terminalUnlocked: boolean;
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
  // Step management
  setExerciseData: (data: Exercise) => void;
  startStep: () => void;
  validateAndCompleteStep: (inputFlag: string) => boolean;

  // Legacy actions
  selectComponent: (componentId: string) => void;
  resetExercise: () => void;
  setActiveTool: (tool: Tool) => void;
  updateMousePosition: (position: MousePosition | null) => void;
  measureComponent: (componentId: string) => void;
  clearMeasurement: () => void;
  setMultimeterMode: (mode: MultimeterMode) => void;
  setSnapTarget: (pinId: string | null) => void;
  selectProbe: (probeNumber: 'first' | 'second') => void;
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
  validateFlag: (inputFlag: string, toolId: 'multimeter' | 'probes' | 'terminal') => boolean;
  unlockTool: (toolId: 'multimeter' | 'probes' | 'terminal') => void;
}

type ExerciseStore = ExerciseState & ExerciseActions;

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  // Step management state
  exerciseData: null,
  currentStepIndex: 0,
  currentObjectiveIndex: 0,
  stepMode: 'education',
  isSimulatorEnabled: false,

  // Stato iniziale (legacy)
  currentStep: 0,
  foundComponents: [],
  flag: 'flag{????????????????????}',
  uartFlag: '',
  isFinished: false,
  activeTool: 'pointer',
  multimeterUnlocked: true,
  uartUnlocked: true,
  terminalUnlocked: true,
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
  resetExercise: () => {
    const { exerciseData: data } = get();
    set({
      currentStepIndex: 0,
      currentObjectiveIndex: 0,
      stepMode: 'education',
      isSimulatorEnabled: false,
      currentStep: 0,
      foundComponents: [],
      flag: data?.initialFlag || 'flag{????????????????????}',
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
      uartFlag: '',
      multimeterUnlocked: true,
      uartUnlocked: true,
      terminalUnlocked: true,
      lensVisible: false,
      lensIsAnchored: false,
      lensAnchorPosition: null,
    });
  },
  
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
    }
    // Quando si attiva il multimetro, l'utente deve cliccare sul puntale per selezionarlo

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

  selectProbe: (probeNumber) => {
    const { activeProbe, probe1, probe2 } = get();

    // Se clicco lo stesso puntale già attivo, lo deseleziono
    if (activeProbe === probeNumber) {
      set({ activeProbe: null, snapTarget: null });
      return;
    }

    // Se il puntale è già agganciato, sgancialo prima
    if (probeNumber === 'first' && probe1.hookedTo) {
      set({ probe1: { hookedTo: null }, probe2: { hookedTo: null }, activeProbe: probeNumber, snapTarget: null });
    } else if (probeNumber === 'second' && probe2.hookedTo) {
      set({ probe2: { hookedTo: null }, activeProbe: probeNumber, snapTarget: null });
    } else {
      // Altrimenti seleziona semplicemente il puntale
      set({ activeProbe: probeNumber, snapTarget: null });
    }
  },

  unhookProbe: (probeNumber) => {
    if (probeNumber === 'first') {
      // Se sgancio il primo puntale (rosso), devo sganciare anche il secondo (nero)
      set({
        probe1: { hookedTo: null },
        probe2: { hookedTo: null }, // Sgancia anche il nero
        activeProbe: null,
        snapTarget: null
      });
    } else { // 'second'
      // Se sgancio solo il secondo (nero), il primo rimane agganciato
      set({
        probe2: { hookedTo: null },
        activeProbe: null,
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
    const { terminalDiscoveries, foundComponents, uartConnected, exerciseData: data } = get();
    if (!terminalDiscoveries.includes(id)) {
      const newDiscoveries = [...terminalDiscoveries, id];

      // Controlla se l'esercizio è completato (tutte le 3 condizioni):
      // 1. Tutti i componenti trovati
      // 2. UART connesso
      // 3. Tutte le 6 discovery del terminale fatte (vedi FLAG_PARTS in terminalData.ts)
      const allComponentsFound = data?.components ? foundComponents.length === data.components.length : false;
      const allDiscoveriesDone = newDiscoveries.length === 6; // 6 = numero di FLAG_PARTS
      const exerciseIsNowFinished = allComponentsFound && uartConnected && allDiscoveriesDone;

      set({
        terminalDiscoveries: newDiscoveries,
        isFinished: exerciseIsNowFinished
      });
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
    const { activeAdapterPin, uartSnapTarget, uartConnections, exerciseData: data } = get();
    if (!activeAdapterPin || !uartSnapTarget || !data) return;

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
      const pin = data.uartPins?.find(p => p.id === conn.pcbPinId);
      if (!pin) return false;
      return pin.role === correctMapping[conn.adapterPin];
    });

    const newState: Partial<ExerciseState> = {
      uartConnections: updated,
      activeAdapterPin: null,
      uartSnapTarget: null,
      uartConnected: allCorrect,
    };

    if (allCorrect) {
      // Genera la flag UART che servirà per sbloccare il terminale
      newState.uartFlag = 'flag{UART_CONNECTED}';
    }

    set(newState);
  },

  unhookUartProbe: (adapterPin) => {
    const { uartConnections } = get();
    const updated = uartConnections.map(c =>
      c.adapterPin === adapterPin ? { ...c, pcbPinId: null } : c
    );
    set({ uartConnections: updated, uartConnected: false });
  },

  selectComponent: (componentId) => {
    const {
      currentStepIndex,
      currentObjectiveIndex,
      stepMode,
      foundComponents,
      exerciseData: data
    } = get();

    // Solo se siamo in modalità active
    if (stepMode !== 'active' || !data || !data.steps) return;

    const currentStep = data.steps[currentStepIndex];
    if (!currentStep || !currentStep.objectives) return;

    const currentObjective = currentStep.objectives[currentObjectiveIndex];
    if (!currentObjective || componentId !== currentObjective.id) return;

    // Componente corretto! Aggiorna stato
    const newFoundComponents = [...foundComponents, componentId];

    // Costruisci flag progressiva con tutti gli obiettivi completati finora
    let flagContent = '';
    for (let i = 0; i <= currentObjectiveIndex; i++) {
      flagContent += currentStep.objectives[i].flagPart;
    }
    const newFlag = `flag{${flagContent}}`;

    // Verifica se è l'ultimo obiettivo dello step
    const isLastObjective = currentObjectiveIndex === currentStep.objectives.length - 1;

    if (isLastObjective) {
      // Ultimo obiettivo completato -> modalità completed
      set({
        foundComponents: newFoundComponents,
        flag: newFlag,
        stepMode: 'completed',
        isSimulatorEnabled: false,
        lensVisible: false,
        lensIsAnchored: false,
        lensAnchorPosition: null,
      });
    } else {
      // Passa al prossimo obiettivo
      set({
        foundComponents: newFoundComponents,
        flag: newFlag,
        currentObjectiveIndex: currentObjectiveIndex + 1,
      });
    }
  },

  setLensRadius: (radius) => set({ lensRadius: Math.max(50, Math.min(200, radius)) }),
  setLensZoomLevel: (zoom) => set({ lensZoomLevel: Math.max(1.5, Math.min(5, zoom)) }),
  toggleLensVisible: () => {
    const { lensVisible, activeTool, probe1, probe2, uartConnections, mousePosition } = get();

    if (lensVisible) {
      // Se la lente è visibile, nascondila
      set({ lensVisible: false, lensIsAnchored: false, lensAnchorPosition: null });
    } else {
      // Se vogliamo mostrare la lente, verifica che il tool corrente sia completo
      let canActivateLens = true;
      let shouldSwitchToPointer = false;

      if (activeTool === 'multimeter') {
        // Multimetro: entrambi i puntali devono essere agganciati
        if (!probe1.hookedTo || !probe2.hookedTo) {
          canActivateLens = false;
          shouldSwitchToPointer = true;
        }
      } else if (activeTool === 'probes') {
        // Sonde UART: tutte e 3 le connessioni devono essere effettuate
        const allConnected = uartConnections.every(conn => conn.pcbPinId !== null);
        if (!allConnected) {
          canActivateLens = false;
          shouldSwitchToPointer = true;
        }
      }
      // pointer e terminal possono sempre attivare la lente

      const initialPosition = mousePosition || { x: 400, y: 300 };

      if (shouldSwitchToPointer) {
        set({
          activeTool: 'pointer',
          lensVisible: true,
          lensIsAnchored: true,
          lensAnchorPosition: initialPosition,
          mousePosition: initialPosition,
        });
      } else if (canActivateLens) {
        set({
          lensVisible: true,
          lensIsAnchored: true,
          lensAnchorPosition: initialPosition,
          mousePosition: initialPosition,
        });
      }
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

  validateFlag: (inputFlag, toolId) => {
    const { flag, uartFlag, exerciseData: data } = get();

    // Gestione flag progressiva (componenti) -> sblocca multimetro E UART contemporaneamente
    if ((toolId === 'multimeter' || toolId === 'probes') && inputFlag === flag) {
      set({
        multimeterUnlocked: true,
        uartUnlocked: true,
        flag: data?.initialFlag || 'flag{????????????????????}'  // Resetta dopo sblocco
      });
      return true;
    }

    // Gestione uartFlag -> sblocca terminale
    if (toolId === 'terminal' && inputFlag === uartFlag) {
      set({ terminalUnlocked: true });
      return true;
    }

    return false;
  },

  unlockTool: (toolId) => {
    if (toolId === 'multimeter') {
      set({ multimeterUnlocked: true });
    } else if (toolId === 'probes') {
      set({ uartUnlocked: true });
    } else if (toolId === 'terminal') {
      set({ terminalUnlocked: true });
    }
  },

  // Step management actions
  setExerciseData: (data) => {
    set({
      exerciseData: data,
      currentStepIndex: 0,
      currentObjectiveIndex: 0,
      stepMode: 'education',
      isSimulatorEnabled: false,
    });
  },

  startStep: () => {
    const { exerciseData: data } = get();
    set({
      stepMode: 'active',
      isSimulatorEnabled: true,
      foundComponents: [],
      flag: data?.initialFlag || 'flag{????????????????????}',
    });
  },

  validateAndCompleteStep: (inputFlag) => {
    const { exerciseData: data, currentStepIndex, flag } = get();
    if (!data || !data.steps || !data.steps[currentStepIndex]) return false;

    // La flag deve corrispondere a quella completa dello step corrente
    if (inputFlag !== flag) return false;

    // Flag valida - passa allo step successivo
    const isLastStep = currentStepIndex === data.steps.length - 1;

    if (isLastStep) {
      // Tutti gli step completati
      set({
        isFinished: true,
      });
    } else {
      // Passa allo step successivo
      set({
        currentStepIndex: currentStepIndex + 1,
        currentObjectiveIndex: 0,
        stepMode: 'education',
        isSimulatorEnabled: false,
        foundComponents: [],
        flag: data.initialFlag,
        lensVisible: false,
        lensIsAnchored: false,
        lensAnchorPosition: null,
      });
    }

    return true;
  },
}));