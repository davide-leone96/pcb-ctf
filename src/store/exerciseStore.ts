// src/store/exerciseStore.ts

import { create } from 'zustand';
import type { Exercise, PinCondition, FirmwareDumpProbeConfig } from '@/data/exercise';
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
export interface FirmwareDumpConnection { probeId: string; pinId: string | null; }
export type FirmwareDumpStatus = 'idle' | 'dumping' | 'complete';

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

  // Firmware dump tool state
  firmwareDumpConnections: FirmwareDumpConnection[];
  activeFirmwareProbeId: string | null;
  firmwareDumpSnapTarget: string | null;
  firmwareDumpPosition: MousePosition | null;
  firmwareDumpStatus: FirmwareDumpStatus;
  firmwareDumpConnected: boolean;

  // Terminal auto-launch (set by UART/firmware-dump completion)
  activeTerminalComponentId: string | null;
  /** Tab del terminale da attivare automaticamente quando il terminale si apre */
  activeTerminalDefaultTab: string | null;
  /** Flag progressiva del terminale (aggiornata dal componente Terminal) */
  terminalCurrentFlag: string;
  /** Il valore completeFlag del terminale (per costruire la flag combinata dello step) */
  terminalCompleteFlag: string;
  /** Se la challenge del terminale è stata completata */
  terminalChallengeCompleted: boolean;
  /** Descrizione del sotto-obiettivo terminale corrente (dalla flag part) */
  terminalObjectiveDescription: string;
  /** Hint del sotto-obiettivo terminale corrente (dalla flag part) */
  terminalObjectiveHint: string;
}

interface ExerciseActions {
  // Step management
  setExerciseData: (data: Exercise) => void;
  startStep: () => void;
  validateAndCompleteStep: (inputFlag: string) => boolean;
  _completeCurrentObjective: (opts?: { fromTerminal?: boolean }) => void;
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

  // Terminal challenge completion (called by Terminal component when all flags discovered)
  completeTerminalChallenge: () => void;
  /** Aggiorna la flag progressiva del terminale (chiamato dal componente Terminal) */
  setTerminalCurrentFlag: (flag: string) => void;
  /** Imposta il valore completeFlag del terminale */
  setTerminalCompleteFlag: (flag: string) => void;
  /** Aggiorna descrizione e hint del sotto-obiettivo terminale corrente */
  setTerminalObjectiveInfo: (description: string, hint: string) => void;

  // Firmware dump actions
  selectFirmwareProbe: (probeId: string) => void;
  setFirmwareDumpSnapTarget: (pinId: string | null) => void;
  hookFirmwareProbe: () => void;
  unhookFirmwareProbe: (probeId: string) => void;
  setFirmwareDumpPosition: (position: MousePosition | null) => void;
  startFirmwareDump: () => void;
  completeFirmwareDump: () => void;
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

  // Firmware dump tool initial state
  firmwareDumpConnections: [],
  activeFirmwareProbeId: null,
  firmwareDumpSnapTarget: null,
  firmwareDumpPosition: null,
  firmwareDumpStatus: 'idle',
  firmwareDumpConnected: false,

  // Terminal auto-launch
  activeTerminalComponentId: null,
  activeTerminalDefaultTab: null,
  terminalCurrentFlag: '',
  terminalCompleteFlag: '',
  terminalChallengeCompleted: false,
  terminalObjectiveDescription: '',
  terminalObjectiveHint: '',

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
      // Firmware dump reset
      firmwareDumpConnections: [],
      activeFirmwareProbeId: null,
      firmwareDumpSnapTarget: null,
      firmwareDumpPosition: null,
      firmwareDumpStatus: 'idle',
      firmwareDumpConnected: false,
      // Terminal auto-launch reset
      activeTerminalComponentId: null,
      activeTerminalDefaultTab: null,
      terminalCurrentFlag: '',
      terminalCompleteFlag: '',
      terminalChallengeCompleted: false,
      terminalObjectiveDescription: '',
      terminalObjectiveHint: '',
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
    if (!newActiveTools.includes('firmware-dump')) {
      set({ activeFirmwareProbeId: null, firmwareDumpSnapTarget: null });
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

      // La completion dell'obiettivo è ora gestita da completeTerminalChallenge(),
      // chiamato dal componente Terminal quando tutti i flag del terminale sono scoperti.
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

      // Auto-launch terminal from toolConfig (UART connector configuration)
      const uartConfig = storeData?.toolConfig?.uartConnector;
      console.log('[hookUartProbe] allCorrect, uartConfig.terminalComponentId:', uartConfig?.terminalComponentId, 'current activeTerminal:', get().activeTerminalComponentId);
      if (uartConfig?.terminalComponentId && !get().activeTerminalComponentId) {
        set({
          activeTerminalComponentId: uartConfig.terminalComponentId,
          activeTerminalDefaultTab: uartConfig.terminalDefaultTab ?? null,
        });
        console.log('[hookUartProbe] SET activeTerminalComponentId to:', uartConfig.terminalComponentId);
      }

      if (stepMode === 'active') {
        // Auto-launch terminal if the objective specifies a terminal component
        if (currentObj?.terminalComponentId) {
          set({ activeTerminalComponentId: currentObj.terminalComponentId });
        }
        // Completa obiettivi di tipo 'uart':
        // - Se è stato lanciato un terminale → NON completare ora,
        //   sarà completato da addTerminalDiscovery dopo tutti i flag terminale
        // - Altrimenti → completa direttamente al collegamento dei pin
        if (currentObj?.type === 'uart') {
          if (!get().activeTerminalComponentId) {
            get()._completeCurrentObjective();
          }
        }
        // Obiettivi 'pin' con adapter sono gestiti da _checkPinConditions (sotto)
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

  _completeCurrentObjective: (opts) => {
    const {
      currentStepIndex,
      currentObjectiveIndex,
      foundComponents,
      exerciseData: data,
      activeTerminalComponentId,
    } = get();

    if (!data || !data.steps) return;

    const currentStep = data.steps[currentStepIndex];
    if (!currentStep || !currentStep.objectives) return;

    const currentObjective = currentStep.objectives[currentObjectiveIndex];
    if (!currentObjective) return;

    // Se il terminale è attivo, solo completeTerminalChallenge può completare l'obiettivo
    if (activeTerminalComponentId && !opts?.fromTerminal) {
      console.log('[_completeCurrentObjective] BLOCKED: terminal active, caller:', new Error().stack?.split('\n')[2]);
      return;
    }
    console.log('[_completeCurrentObjective] EXECUTING for:', currentObjective.id, currentObjective.type, 'fromTerminal:', opts?.fromTerminal, 'activeTerminal:', activeTerminalComponentId);

    // Previeni doppio completamento dello stesso obiettivo
    if (foundComponents.includes(currentObjective.id)) return;

    const newFoundComponents = [...foundComponents, currentObjective.id];

    // Costruisci flag progressiva
    let flagContent = '';
    for (let i = 0; i <= currentObjectiveIndex; i++) {
      flagContent += currentStep.objectives[i].flagPart;
    }
    // Se il terminale ha una completeFlag, aggiungila come parte della flag dello step
    const { terminalCompleteFlag } = get();
    if (terminalCompleteFlag) {
      flagContent += '_' + terminalCompleteFlag;
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

    const { firmwareDumpConnections } = get();

    const isConditionMet = (cond: PinCondition) => {
      // Firmware dump probe conditions: "fw-probe:<probeId>"
      if (cond.terminal.startsWith('fw-probe:')) {
        const probeId = cond.terminal.slice('fw-probe:'.length);
        return firmwareDumpConnections.find(c => c.probeId === probeId)?.pinId === cond.pinId;
      }
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
      // Se le condizioni soddisfatte coinvolgono adapter pin, auto-launch terminale
      const hasAdapterConditions = conditions.some(c =>
        c.terminal.startsWith('adapter-')
      );
      if (hasAdapterConditions) {
        // Marca UART come connesso (le condizioni adapter sono soddisfatte)
        set({ uartConnected: true, uartEverConnected: true });

        // Auto-launch terminal from toolConfig (UART connector)
        const uartConfig = data?.toolConfig?.uartConnector;
        if (uartConfig?.terminalComponentId && !get().activeTerminalComponentId) {
          set({
            activeTerminalComponentId: uartConfig.terminalComponentId,
            activeTerminalDefaultTab: uartConfig.terminalDefaultTab ?? null,
          });
        }
        // Auto-launch terminal from objective
        if (currentObj.terminalComponentId && !get().activeTerminalComponentId) {
          set({ activeTerminalComponentId: currentObj.terminalComponentId });
        }
      }

      // Se le condizioni coinvolgono firmware dump probes, auto-launch terminale dal tool config
      const hasFwProbeConditions = conditions.some(c =>
        c.terminal.startsWith('fw-probe:')
      );
      if (hasFwProbeConditions) {
        const fwConfig = data?.toolConfig?.firmwareDump;
        if (fwConfig?.terminalComponentId && !get().activeTerminalComponentId) {
          set({
            activeTerminalComponentId: fwConfig.terminalComponentId,
            activeTerminalDefaultTab: fwConfig.terminalDefaultTab ?? null,
          });
        }
      }

      // Se è stato lanciato un terminale → NON completare ora,
      // sarà completato da addTerminalDiscovery quando tutti i flag terminale sono scoperti.
      // Se NON c'è un terminale → completa direttamente.
      const termId = get().activeTerminalComponentId;
      console.log('[_checkPinConditions] satisfied, activeTerminalComponentId:', termId);
      if (!termId) {
        get()._completeCurrentObjective();
      }
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

  // =========================================================================
  // ===         TERMINAL CHALLENGE COMPLETION                            ===
  // =========================================================================
  completeTerminalChallenge: () => {
    const { stepMode, activeTerminalComponentId } = get();
    if (stepMode !== 'active' || !activeTerminalComponentId) return;
    set({ terminalChallengeCompleted: true });
    get()._completeCurrentObjective({ fromTerminal: true });
  },

  setTerminalCurrentFlag: (flag) => set({ terminalCurrentFlag: flag }),
  setTerminalCompleteFlag: (flag) => set({ terminalCompleteFlag: flag }),
  setTerminalObjectiveInfo: (description, hint) => set({ terminalObjectiveDescription: description, terminalObjectiveHint: hint }),

  // =========================================================================
  // ===                     FIRMWARE DUMP ACTIONS                        ===
  // =========================================================================
  selectFirmwareProbe: (probeId) => {
    const { activeFirmwareProbeId, firmwareDumpConnections } = get();
    if (activeFirmwareProbeId === probeId) {
      set({ activeFirmwareProbeId: null, firmwareDumpSnapTarget: null });
      return;
    }
    // If already connected, disconnect first
    const conn = firmwareDumpConnections.find(c => c.probeId === probeId);
    if (conn?.pinId) {
      const updated = firmwareDumpConnections.map(c =>
        c.probeId === probeId ? { ...c, pinId: null } : c
      );
      set({ firmwareDumpConnections: updated });
    }
    set({ activeFirmwareProbeId: probeId, firmwareDumpSnapTarget: null });
  },

  setFirmwareDumpSnapTarget: (pinId) => set({ firmwareDumpSnapTarget: pinId }),

  hookFirmwareProbe: () => {
    const { activeFirmwareProbeId, firmwareDumpSnapTarget, firmwareDumpConnections, exerciseData: data } = get();
    if (!activeFirmwareProbeId || !firmwareDumpSnapTarget || !data) return;

    // Prevent connecting two probes to the same pin
    const alreadyUsed = firmwareDumpConnections.find(
      c => c.pinId === firmwareDumpSnapTarget && c.probeId !== activeFirmwareProbeId
    );
    if (alreadyUsed) return;

    const updated = firmwareDumpConnections.map(c =>
      c.probeId === activeFirmwareProbeId ? { ...c, pinId: firmwareDumpSnapTarget } : c
    );

    // Validate firmware dump connections: role-based (like UART)
    // Each probe has a role (SpiRole), each FirmwareDumpPin has a role.
    // All probes must be connected and each probe's role must match the pin's role.
    const fwConfig = data.toolConfig?.firmwareDump;
    const fwProbes = fwConfig?.probes ?? [];
    const allRequiredConnected = fwProbes.length > 0 && updated.every(conn => {
      if (!conn.pinId) return false;
      const probeConfig = fwProbes.find(p => p.id === conn.probeId);
      if (!probeConfig) return false;
      const pin = data.firmwareDumpPins?.find(p => p.id === conn.pinId);
      if (!pin) return false;
      return pin.role === probeConfig.role;
    });

    const newState: Partial<ExerciseState> = {
      firmwareDumpConnections: updated,
      activeFirmwareProbeId: null,
      firmwareDumpSnapTarget: null,
      firmwareDumpConnected: allRequiredConnected,
    };

    if (allRequiredConnected) {
      // Auto-launch terminal from toolConfig (firmware dump configuration)
      const fwConfigTerminal = data?.toolConfig?.firmwareDump;
      if (fwConfigTerminal?.terminalComponentId && !get().activeTerminalComponentId) {
        newState.activeTerminalComponentId = fwConfigTerminal.terminalComponentId;
        newState.activeTerminalDefaultTab = fwConfigTerminal.terminalDefaultTab ?? null;
      }

      // Auto-launch terminal from objective if configured
      const { stepMode, currentStepIndex, currentObjectiveIndex } = get();
      if (stepMode === 'active') {
        const currentStep = data?.steps?.[currentStepIndex];
        const currentObj = currentStep?.objectives?.[currentObjectiveIndex];
        if (currentObj?.terminalComponentId) {
          newState.activeTerminalComponentId = currentObj.terminalComponentId;
        }
      }
    }

    set(newState);

    // Check pin conditions after each firmware dump connection
    get()._checkPinConditions();
  },

  unhookFirmwareProbe: (probeId) => {
    const { firmwareDumpConnections } = get();
    const updated = firmwareDumpConnections.map(c =>
      c.probeId === probeId ? { ...c, pinId: null } : c
    );
    set({ firmwareDumpConnections: updated, firmwareDumpConnected: false });
  },

  setFirmwareDumpPosition: (position) => set({ firmwareDumpPosition: position }),

  startFirmwareDump: () => set({ firmwareDumpStatus: 'dumping' }),

  completeFirmwareDump: () => {
    set({ firmwareDumpStatus: 'complete' });
    // Complete firmware-dump objective if active
    const { stepMode, exerciseData: data, currentStepIndex, currentObjectiveIndex } = get();
    const currentStep = data?.steps?.[currentStepIndex];
    const currentObj = currentStep?.objectives?.[currentObjectiveIndex];

    // Auto-launch terminal from toolConfig (firmware dump configuration)
    const fwConfig = data?.toolConfig?.firmwareDump;
    if (fwConfig?.terminalComponentId && !get().activeTerminalComponentId) {
      set({
        activeTerminalComponentId: fwConfig.terminalComponentId,
        activeTerminalDefaultTab: fwConfig.terminalDefaultTab ?? null,
      });
    }

    if (stepMode === 'active' && currentObj?.type === 'firmware-dump') {
      // Auto-launch terminal if the objective specifies a terminal component (overrides toolConfig)
      if (currentObj.terminalComponentId) {
        set({ activeTerminalComponentId: currentObj.terminalComponentId });
      }
      // Se è stato lanciato un terminale → NON completare ora,
      // sarà completato da addTerminalDiscovery quando tutti i flag terminale sono scoperti.
      if (!get().activeTerminalComponentId) {
        get()._completeCurrentObjective();
      }
    }
  },

  // Step management actions
  setExerciseData: (data) => {
    const magnifierConfig = data?.toolConfig?.magnifier;
    const fwProbes = data?.toolConfig?.firmwareDump?.probes ?? [];
    set({
      exerciseData: data,
      currentStepIndex: 0,
      currentObjectiveIndex: 0,
      stepMode: 'education',
      isSimulatorEnabled: false,
      foundComponents: [],
      flag: computeBlankFlag(data?.steps?.[0]),
      // Applica configurazione lente dal toolConfig
      ...(magnifierConfig ? {
        lensRadius: magnifierConfig.defaultRadius,
        lensZoomLevel: magnifierConfig.defaultZoomLevel,
      } : {}),
      // Initialize firmware dump connections from config
      firmwareDumpConnections: fwProbes.map(p => ({ probeId: p.id, pinId: null })),
      firmwareDumpStatus: 'idle',
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
      set({ isFinished: true });
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
        // Reset terminal state for new step
        activeTerminalComponentId: null,
        activeTerminalDefaultTab: null,
        terminalCurrentFlag: '',
        terminalCompleteFlag: '',
        terminalChallengeCompleted: false,
        terminalDiscoveries: [],
        terminalObjectiveDescription: '',
        terminalObjectiveHint: '',
      });
    }

    return true;
  },

}));