'use client';

import { useState, useEffect } from 'react';
import FlagDisplay from '@/components/features/exercise/FlagDisplay';
import InstructionsPanel from '@/components/features/exercise/InstructionsPanel';
import PCBViewer from '@/components/features/exercise/PCBViewer';
import Sidebar from '@/components/layout/Sidebar';
import { buildTerminalFlag } from '@/data/terminalData';
import { useExerciseStore } from '@/store/exerciseStore';
import CompletionDialog from '@/components/features/exercise/CompletionDialog';
import StepCompletionDialog from '@/components/features/exercise/StepCompletionDialog';
import Terminal from '@/components/features/exercise/Terminal';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';

export default function Home() {
  const { config: exerciseData, isLoading } = useExerciseConfig();
  const [showStepCompletionDialog, setShowStepCompletionDialog] = useState(false);

  const {
    currentStepIndex,
    currentObjectiveIndex,
    stepMode,
    isSimulatorEnabled,
    flag,
    isFinished,
    resetExercise,
    activeTool,
    activeTools,
    terminalDiscoveries,
    uartEverConnected,
    lensVisible,
    startStep,
    validateAndCompleteStep,
    setExerciseData,
  } = useExerciseStore();

  useEffect(() => {
    if (!isLoading) {
      setExerciseData(exerciseData);
    }
  }, [isLoading, exerciseData, setExerciseData]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Caricamento configurazione...</div>
      </main>
    );
  }

  if (!exerciseData.steps || exerciseData.steps.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl text-center">
          <p className="text-red-400 mb-4">Errore: Configurazione esercizio non valida</p>
          <p className="text-gray-400 text-sm">La struttura degli step non è stata trovata.</p>
        </div>
      </main>
    );
  }

  const currentStep = exerciseData.steps[currentStepIndex];
  const currentObjective = currentStep?.objectives?.[currentObjectiveIndex];

  // Il terminale è bloccato se toolConfig.terminal.requiresUart oppure
  // se esistono obiettivi terminal con requiresUart (retrocompatibilità)
  const terminalRequiresUart = exerciseData.toolConfig?.terminal?.requiresUart ??
    exerciseData.steps.some(s => s.objectives.some(o => o.type === 'terminal' && o.requiresUart));
  const canAccessTerminal = !terminalRequiresUart || uartEverConnected;

  const handleNextStep = () => {
    setShowStepCompletionDialog(true);
  };

  const handleValidateFlag = (inputFlag: string): boolean => {
    const isValid = validateAndCompleteStep(inputFlag);
    if (isValid) {
      setShowStepCompletionDialog(false);
    }
    return isValid;
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-6 lg:p-12">
      <CompletionDialog isOpen={isFinished} flag={flag} onReset={resetExercise} config={exerciseData.completionDialog} />

      <StepCompletionDialog
        isOpen={showStepCompletionDialog}
        onClose={() => setShowStepCompletionDialog(false)}
        onValidate={handleValidateFlag}
        currentStepNumber={currentStepIndex + 1}
      />

      <h1 className="mb-8 text-3xl font-bold text-white">
        ARTIC Web Platform
      </h1>

      {stepMode === 'education' ? (
        /* Education mode: centered description + start button only */
        <div className="w-full max-w-2xl">
          <InstructionsPanel
            stepMode={stepMode}
            stepTitle={currentStep?.title || ''}
            stepDescription={currentStep?.description || ''}
            objectiveName=""
            objectiveInstruction=""
            hintText=""
            onStartStep={startStep}
            onNextStep={handleNextStep}
          />
        </div>
      ) : (
        /* Active / Completed mode: full grid layout */
        <div className="grid w-full max-w-7xl gap-x-8 gap-y-6" style={{ gridTemplateColumns: 'auto 1fr' }}>
          {/* Row 1, Col 2: istruzioni + flag */}
          <div className="col-start-2 row-start-1 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className={stepMode === 'completed' ? 'md:col-span-2' : 'md:col-span-2'}>
              <InstructionsPanel
                stepMode={stepMode}
                stepTitle={currentStep?.title || ''}
                stepDescription={currentStep?.description || ''}
                objectiveName={currentObjective?.name || ''}
                objectiveInstruction={currentObjective?.instruction || ''}
                hintText={currentObjective?.hint || ''}
                onStartStep={startStep}
                onNextStep={handleNextStep}
              />
            </div>
            <div className="md:col-span-1">
              <FlagDisplay
                flag={
                  activeTools.includes('terminal')
                    ? buildTerminalFlag(terminalDiscoveries)
                    : flag
                }
              />
            </div>
          </div>

          {/* Row 2, Col 1: sidebar */}
          <div className="col-start-1 row-start-2 self-center relative flex-shrink-0">
            <Sidebar />
          </div>

          {/* Row 2, Col 2: contenuto principale */}
          <div className="col-start-2 row-start-2 border-2 border-dashed border-gray-500 rounded-lg p-4 relative">
            {activeTools.includes('terminal') ? (
              canAccessTerminal ? (
                <Terminal />
              ) : (
                <div className="h-[500px] bg-black/95 rounded-lg text-white font-mono text-sm flex items-center justify-center border border-red-900/50">
                  <div className="text-center">
                    <p className="text-yellow-400 font-bold text-base">Nessuna connessione UART</p>
                    <p className="text-gray-400 mt-2">Collega le sonde dall&apos;adattatore USB-to-Serial ai pin UART prima di aprire il terminale.</p>
                  </div>
                </div>
              )
            ) : (
              <PCBViewer />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
