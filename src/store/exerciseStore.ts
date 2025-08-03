// src/store/exerciseStore.ts

import { create } from "zustand";
import { exerciseData, HardwareComponent } from "@/data/exercise";

// Definiamo la "forma" del nostro stato
interface ExerciseState {
  currentStep: number; // Indice del componente da trovare nell'array exerciseData.components
  foundComponents: string[]; // Array degli ID dei componenti già trovati
  flag: string; // La flag attuale, che viene costruita man mano
  isFinished: boolean; // Indica se l'esercizio è stato completato
  activeTool: Tool;
  measuredComponentId: string | null; // <-- NUOVO: L'ID del componente misurato
  mousePosition: MousePosition | null;
}

interface MousePosition {
  x: number;
  y: number;
}

// 1. Definiamo un tipo per i nostri tool per avere type safety
export type Tool = "pointer" | "magnifier" | "multimeter";

// Definiamo le "azioni" che possiamo compiere sullo stato
interface ExerciseActions {
  /**
   * La funzione principale: gestisce il click di un utente su un componente.
   * @param componentId L'ID del componente su cui l'utente ha cliccato.
   */
  selectComponent: (componentId: string) => void;
  /** Resetta l'esercizio allo stato iniziale. */
  resetExercise: () => void;
  setActiveTool: (tool: Tool) => void;
  clearMeasurement: () => void;
  measureComponent: (componentId: string) => void;
  updateMousePosition: (position: MousePosition | null) => void;
}

// Uniamo stato e azioni in un unico tipo per il nostro store
type ExerciseStore = ExerciseState & ExerciseActions;

// Creiamo lo store usando la funzione `create` di Zustand
export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  // --- STATO INIZIALE ---
  currentStep: 0,
  foundComponents: [],
  flag: exerciseData.initialFlag,
  isFinished: false,
  activeTool: "pointer", // Impostiamo il tool iniziale come 'pointer'
  measuredComponentId: null,
  mousePosition: null,

  // --- AZIONI ---
  resetExercise: () =>
    set({
      currentStep: 0,
      foundComponents: [],
      flag: exerciseData.initialFlag,
      isFinished: false,
      activeTool: 'pointer',
      measuredComponentId: null,
      mousePosition: null,
    }),

  setActiveTool: (tool) => {
    // Quando deselezioniamo la lente, nascondiamo la posizione del mouse
    if (tool !== 'magnifier') {
      set({ activeTool: tool, mousePosition: null });
    } else {
      set({ activeTool: tool });
    }
  },
  updateMousePosition: (position) => set({ mousePosition: position }),

  // NUOVE AZIONI PER IL MULTIMETRO
  measureComponent: (componentId: string) => set({ measuredComponentId: componentId }),
  clearMeasurement: () => set({ measuredComponentId: null }),

  selectComponent: (componentId: string) => {
    const { currentStep, foundComponents, isFinished } = get();

    // Se l'esercizio è già finito, non fare nulla.
    if (isFinished) return;

    // Prendiamo il componente che l'utente DOVREBBE trovare in questo step.
    const correctComponent = exerciseData.components[currentStep];

    // Controlliamo se il componente cliccato è quello corretto.
    if (correctComponent && componentId === correctComponent.id) {
      // È corretto! Aggiorniamo lo stato.
      const newFoundComponents = [...foundComponents, componentId];

      // Costruiamo la nuova flag basandoci sui componenti trovati
      let newFlag = exerciseData.initialFlag;
      let revealedPart = "";
      newFoundComponents.forEach((id) => {
        const part =
          exerciseData.components.find((c) => c.id === id)?.flagPart || "";
        revealedPart += part;
      });
      newFlag = `flag{${revealedPart}}`;

      // Controlliamo se questo era l'ultimo componente.
      const exerciseIsNowFinished =
        newFoundComponents.length === exerciseData.components.length;

      // Usiamo `set` per aggiornare lo stato con i nuovi valori.
      set({
        currentStep: currentStep + 1,
        foundComponents: newFoundComponents,
        flag: newFlag,
        isFinished: exerciseIsNowFinished,
      });
    }
    // Se il componente cliccato non è quello corretto, per ora non facciamo nulla.
  },
}));
