// src/store/exerciseStore.ts

import { create } from 'zustand';
import type { Exercise, PinCondition } from '@/data/exercise';
import { type Tool, ALL_TOOLS } from '@/data/exercise';

export type { Tool };
export type MultimeterMode = 'V' | 'Ohm';

/** Derives a blank flag placeholder whose length matches the concatenated flagParts of the step's objectives. */
function computeBlankFlag(step?: { objectives?: Array<{ flagPart?: string }> }): string {
  const total = step?.objectives?.reduce((acc, o) => acc + (o.flagPart?.length ?? 0), 0) ?? 0;
  return total > 0 ? `flag{${'?'.repeat(total)}}` : 'flag{????}';
}
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
  activeTools: Tool[];
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
  uartEverConnected: boolean;
  lensRadius: number;
  lensZoomLevel: number;
  lensVisible: boolean;
  lensIsAnchored: boolean;
  lensAnchorPosition: MousePosition | null;
  multimeterPosition: MousePosition | null;
  uartAdapterPosition: MousePosition | null;

  // Custom tools
  activeCustomToolId: string | null;
  activeCustomProbeId: string | null;
  customSnapTarget: { probeId: string; pinId: string } | null;
  customToolConnections: Record<string, Array<{ probeId: string; pinId: string | null }>>;
  customToolPositions: Record<string, { x: number; y: number }>;
}

interface ExerciseActions {
  // Step management
  setExerciseData: (data: Exercise) => void;
  startStep: () => void;
  validateAndCompleteStep: (inputFlag: string) => boolean;
  _completeCurrentObjective: () => void;
  _checkPinConditions: () => void;

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
  setMultimeterPosition: (position: MousePosition | null) => void;
  setUartAdapterPosition: (position: MousePosition | null) => void;
  validateFlag: (inputFlag: string, toolId: 'multimeter' | 'probes' | 'terminal') => boolean;
  unlockTool: (toolId: 'multimeter' | 'probes' | 'terminal') => void;

  // Custom tool actions
  setActiveCustomTool: (toolId: string) => void;
  setActiveCustomProbe: (toolId: string, probeId: string | null) => void;
  setCustomSnapTarget: (target: { probeId: string; pinId: string } | null) => void;
  hookCustomProbe: (toolId: string, probeId: string, pinId: string) => void;
  unhookCustomProbe: (toolId: string, probeId: string) => void;
  setCustomToolPosition: (toolId: string, x: number, y: number) => void;
  completeFirmwareDump: (toolId: string) => void;
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
  flag: 'flag{????}',
  uartFlag: '',
  isFinished: false,
  activeTool: 'pointer',
  activeTools: ['pointer'],
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
  uartEverConnected: false,
  lensRadius: 120,
  lensZoomLevel: 2.5,
  lensVisible: false,
  lensIsAnchored: false,
  lensAnchorPosition: null,
  multimeterPosition: null,
  uartAdapterPosition: null,

  // Custom tools
  activeCustomToolId: null,
  activeCustomProbeId: null,
  customSnapTarget: null,
  customToolConnections: {},
  customToolPositions: {},

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
      flag: computeBlankFlag(data?.steps?.[0]),
      isFinished: false,
      activeTool: 'pointer',
      activeTools: ['pointer'],
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
      uartEverConnected: false,
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
    const { exerciseData, activeTools: prevTools } = get();
    const groups = exerciseData?.toolGroups ?? [];

    // Trova il gruppo che contiene il tool appena selezionato
    const toolGroup = groups.find(g => g.toolIds.includes(tool));

    let newActiveTools: Tool[];
    if (toolGroup) {
      // Il tool è in un gruppo: i tool dello stesso gruppo possono coesistere
      const groupIds = new Set(toolGroup.toolIds);
      if (prevTools.includes(tool)) {
        // Il tool è già attivo → toggle off (ma non lasciare la lista vuota)
        newActiveTools = prevTools.filter(t => t !== tool);
        if (newActiveTools.length === 0) newActiveTools = ['pointer'];
      } else {
        // Aggiungi il tool, rimuovi quelli che NON sono nel gruppo
        const keptFromGroup = prevTools.filter(t => groupIds.has(t));
        newActiveTools = [...keptFromGroup, tool];
      }
    } else {
      // Il tool non è in nessun gruppo
      if (prevTools.includes(tool) && tool !== 'pointer') {
        // Già attivo → toggle off, torna al pointer
        newActiveTools = ['pointer'];
      } else {
        newActiveTools = [tool];
      }
    }

    const effectiveTool = newActiveTools[newActiveTools.length - 1];
    set({ activeTool: effectiveTool, activeTools: newActiveTools });

    // Pulisci stato transitorio per tool non più attivi
    if (!newActiveTools.includes('multimeter')) {
      set({ activeProbe: null, snapTarget: null });
    }
    if (!newActiveTools.includes('probes')) {
      set({ activeAdapterPin: null, uartSnapTarget: null });
    }
    if (!newActiveTools.includes('custom')) {
      set({ activeCustomToolId: null, activeCustomProbeId: null, customSnapTarget: null });
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
        activeProbe: null,  // Non selezionare automaticamente probe2
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

    // Check pin conditions after each probe connection
    get()._checkPinConditions();
  },
  
  addTerminalDiscovery: (id) => {
    const { terminalDiscoveries } = get();
    if (!terminalDiscoveries.includes(id)) {
      const newDiscoveries = [...terminalDiscoveries, id];

      set({ terminalDiscoveries: newDiscoveries });

      // Completa l'obiettivo terminale corrente quando tutti i flag configurati sono stati scoperti
      const { stepMode, exerciseData: storeData, currentStepIndex, currentObjectiveIndex } = get();
      const currentStep = storeData?.steps?.[currentStepIndex];
      const currentObj = currentStep?.objectives?.[currentObjectiveIndex];

      if (stepMode === 'active' && currentObj?.type === 'terminal') {
        const requiredFlags = (currentObj.bootStageConditions ?? [])
          .flatMap(c => c.unlockedFlags);

        if (
          requiredFlags.length > 0 &&
          requiredFlags.every(f => newDiscoveries.includes(f))
        ) {
          get()._completeCurrentObjective();
        }
      }
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
      newState.uartFlag = 'flag{UART_CONNECTED}';
      newState.uartEverConnected = true;
    }

    set(newState);

    // Se la connessione UART è corretta, completa l'obiettivo corrente
    if (allCorrect) {
      const { stepMode, exerciseData: storeData, currentStepIndex, currentObjectiveIndex } = get();
      const currentStep = storeData?.steps?.[currentStepIndex];
      const currentObj = currentStep?.objectives?.[currentObjectiveIndex];
      if (stepMode === 'active') {
        // Completa obiettivi di tipo 'uart' direttamente
        if (currentObj?.type === 'uart') {
          get()._completeCurrentObjective();
        }
        // Completa anche obiettivi di tipo 'pin' che hanno condizioni adapter
        // (configurati via settings page con pin conditions per UART)
        else if (currentObj?.type === 'pin' && currentObj.pinConditions?.some(
          (c: any) => c.terminal?.startsWith('adapter-')
        )) {
          get()._completeCurrentObjective();
        }
      }
    }

    // Check pin conditions after each UART connection
    get()._checkPinConditions();
  },

  unhookUartProbe: (adapterPin) => {
    const { uartConnections } = get();
    const updated = uartConnections.map(c =>
      c.adapterPin === adapterPin ? { ...c, pcbPinId: null } : c
    );
    set({ uartConnections: updated, uartConnected: false });
  },

  selectComponent: (componentId) => {
    const { currentStepIndex, currentObjectiveIndex, stepMode, exerciseData: data } = get();

    if (stepMode !== 'active' || !data || !data.steps) return;

    const currentStep = data.steps[currentStepIndex];
    if (!currentStep || !currentStep.objectives) return;

    const currentObjective = currentStep.objectives[currentObjectiveIndex];
    if (!currentObjective) return;

    // Solo obiettivi di tipo component (o senza tipo = default component)
    const objType = currentObjective.type || 'component';
    if (objType !== 'component') return;
    if (componentId !== currentObjective.id) return;

    get()._completeCurrentObjective();
  },

  _completeCurrentObjective: () => {
    const {
      currentStepIndex,
      currentObjectiveIndex,
      foundComponents,
      exerciseData: data,
    } = get();

    if (!data || !data.steps) return;

    const currentStep = data.steps[currentStepIndex];
    if (!currentStep || !currentStep.objectives) return;

    const currentObjective = currentStep.objectives[currentObjectiveIndex];
    if (!currentObjective) return;

    // Previeni doppio completamento dello stesso obiettivo
    if (foundComponents.includes(currentObjective.id)) return;

    const newFoundComponents = [...foundComponents, currentObjective.id];

    // Costruisci flag progressiva
    let flagContent = '';
    for (let i = 0; i <= currentObjectiveIndex; i++) {
      flagContent += currentStep.objectives[i].flagPart;
    }
    const newFlag = `flag{${flagContent}}`;

    const isLastObjective = currentObjectiveIndex === currentStep.objectives.length - 1;

    // Verifica che TUTTI gli obiettivi precedenti siano stati completati
    const allPriorCompleted = currentStep.objectives
      .slice(0, currentObjectiveIndex)
      .every(obj => newFoundComponents.includes(obj.id));

    if (isLastObjective && allPriorCompleted) {
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
      set({
        foundComponents: newFoundComponents,
        flag: newFlag,
        currentObjectiveIndex: currentObjectiveIndex + 1,
      });
    }
  },

  _checkPinConditions: () => {
    const {
      stepMode, exerciseData: data, currentStepIndex, currentObjectiveIndex,
      probe1, probe2, uartConnections,
    } = get();

    if (stepMode !== 'active' || !data?.steps) return;

    const currentStep = data.steps[currentStepIndex];
    const currentObj = currentStep?.objectives?.[currentObjectiveIndex];
    if (!currentObj || currentObj.type !== 'pin') return;

    const conditions = currentObj.pinConditions;
    const logic = currentObj.pinLogic || 'AND';
    if (!conditions || conditions.length === 0) return;

    const isConditionMet = (cond: PinCondition) => {
      switch (cond.terminal) {
        case 'probe1': return probe1.hookedTo === cond.pinId;
        case 'probe2': return probe2.hookedTo === cond.pinId;
        case 'adapter-tx': return uartConnections.find(c => c.adapterPin === 'adapter-tx')?.pcbPinId === cond.pinId;
        case 'adapter-rx': return uartConnections.find(c => c.adapterPin === 'adapter-rx')?.pcbPinId === cond.pinId;
        case 'adapter-gnd': return uartConnections.find(c => c.adapterPin === 'adapter-gnd')?.pcbPinId === cond.pinId;
        default: return false;
      }
    };

    const satisfied = logic === 'AND'
      ? conditions.every(isConditionMet)
      : conditions.some(isConditionMet);

    if (satisfied) {
      get()._completeCurrentObjective();
    }
  },

  setLensRadius: (radius) => set({ lensRadius: Math.max(50, Math.min(200, radius)) }),
  setLensZoomLevel: (zoom) => set({ lensZoomLevel: Math.max(1.5, Math.min(5, zoom)) }),
  toggleLensVisible: () => {
    const { lensVisible, activeTool, probe1, probe2, uartConnections, mousePosition, lensAnchorPosition } = get();

    if (lensVisible) {
      set({ lensVisible: false });
    } else {
      const initialPosition = lensAnchorPosition || mousePosition || { x: 400, y: 300 };
      set({
        lensVisible: true,
        lensIsAnchored: true,
        lensAnchorPosition: initialPosition,
        mousePosition: initialPosition,
      });
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
  setMultimeterPosition: (position) => set({ multimeterPosition: position }),
  setUartAdapterPosition: (position) => set({ uartAdapterPosition: position }),

  validateFlag: (inputFlag, toolId) => {
    const { flag, uartFlag, exerciseData: data } = get();

    // Gestione flag progressiva (componenti) -> sblocca multimetro E UART contemporaneamente
    if ((toolId === 'multimeter' || toolId === 'probes') && inputFlag === flag) {
      set({
        multimeterUnlocked: true,
        uartUnlocked: true,
        flag: computeBlankFlag(data?.steps?.[get().currentStepIndex])
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
      foundComponents: [],
      flag: computeBlankFlag(data?.steps?.[0]),
    });
  },

  startStep: () => {
    const { exerciseData: data, currentStepIndex, activeTool } = get();
    const currentStep = data?.steps?.[currentStepIndex];
    const availableTools = currentStep?.availableTools;

    // Se il tool attivo non è tra quelli disponibili per lo step, switch al primo disponibile
    const updates: Partial<ExerciseState> = {
      stepMode: 'active',
      isSimulatorEnabled: true,
      foundComponents: [],
      flag: computeBlankFlag(currentStep),
    };

    if (availableTools?.length && !availableTools.includes(activeTool)) {
      updates.activeTool = availableTools[0];
    }

    set(updates);
  },

  validateAndCompleteStep: (inputFlag) => {
    const { exerciseData: data, currentStepIndex, flag, foundComponents } = get();
    if (!data || !data.steps || !data.steps[currentStepIndex]) return false;

    const currentStep = data.steps[currentStepIndex];

    // Verifica che TUTTI gli obiettivi dello step siano stati completati
    const allObjectivesCompleted = currentStep.objectives.every(
      obj => foundComponents.includes(obj.id)
    );
    if (!allObjectivesCompleted) return false;

    // La flag deve corrispondere a quella completa dello step corrente
    if (inputFlag !== flag) return false;

    // Flag valida e tutti gli obiettivi completati - passa allo step successivo
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
        flag: computeBlankFlag(data.steps[currentStepIndex + 1]),
        lensVisible: false,
        lensIsAnchored: false,
        lensAnchorPosition: null,
      });
    }

    return true;
  },

  // --- Custom tool actions ---

  setActiveCustomTool: (toolId) => {
    const { customToolConnections, exerciseData } = get();
    // Inizializza le connessioni per questo tool se non esistono ancora
    const tool = exerciseData?.customTools?.find(t => t.id === toolId);
    const existingConns = customToolConnections[toolId];
    const connections = existingConns ?? (tool?.probes.map(p => ({ probeId: p.id, pinId: null })) ?? []);
    set({
      activeTool: 'custom',
      activeCustomToolId: toolId,
      activeCustomProbeId: null,
      customSnapTarget: null,
      customToolConnections: { ...customToolConnections, [toolId]: connections },
    });
  },

  setActiveCustomProbe: (toolId, probeId) => {
    set({ activeCustomProbeId: probeId, customSnapTarget: null });
  },

  setCustomSnapTarget: (target) => set({ customSnapTarget: target }),

  hookCustomProbe: (toolId, probeId, pinId) => {
    const { customToolConnections } = get();
    const existing = customToolConnections[toolId] ?? [];
    const updated = existing.map(c => c.probeId === probeId ? { ...c, pinId } : c);
    set({
      customToolConnections: { ...customToolConnections, [toolId]: updated },
      activeCustomProbeId: null,
      customSnapTarget: null,
    });
  },

  unhookCustomProbe: (toolId, probeId) => {
    const { customToolConnections } = get();
    const existing = customToolConnections[toolId] ?? [];
    const updated = existing.map(c => c.probeId === probeId ? { ...c, pinId: null } : c);
    set({ customToolConnections: { ...customToolConnections, [toolId]: updated } });
  },

  setCustomToolPosition: (toolId, x, y) => {
    set(state => ({
      customToolPositions: { ...state.customToolPositions, [toolId]: { x, y } },
    }));
  },

  completeFirmwareDump: (toolId) => {
    const { stepMode, exerciseData: storeData, currentStepIndex, currentObjectiveIndex } = get();
    const currentStep = storeData?.steps?.[currentStepIndex];
    const currentObj = currentStep?.objectives?.[currentObjectiveIndex];
    if (stepMode === 'active' && currentObj?.type === 'firmware-dump' && currentObj.customToolId === toolId) {
      get()._completeCurrentObjective();
    }
  },
}));