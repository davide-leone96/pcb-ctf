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
    uartFlag,
    isFinished,
    resetExercise,
    activeTool,
    terminalDiscoveries,
    uartConnected,
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
      <CompletionDialog isOpen={isFinished} flag={flag} onReset={resetExercise} />

      <StepCompletionDialog
        isOpen={showStepCompletionDialog}
        onClose={() => setShowStepCompletionDialog(false)}
        onValidate={handleValidateFlag}
        currentStepNumber={currentStepIndex + 1}
      />

      <h1 className="mb-8 text-3xl font-bold text-white">
        ARTIC Web Platform
      </h1>

      <div className="flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
        <div className="flex-shrink-0 relative">
          {!isSimulatorEnabled && (
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm rounded-lg z-10" />
          )}
          <Sidebar />
        </div>

        <div className="flex flex-grow flex-col gap-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className={stepMode === 'education' ? 'md:col-span-3' : 'md:col-span-2'}>
              <InstructionsPanel
                stepMode={stepMode}
                stepNumber={currentStepIndex + 1}
                stepTitle={currentStep?.title || ''}
                stepDescription={currentStep?.description || ''}
                objectiveNumber={currentObjectiveIndex + 1}
                objectiveInstruction={currentObjective?.instruction || ''}
                hintText={currentObjective?.hint || ''}
                onStartStep={startStep}
                onNextStep={handleNextStep}
              />
            </div>
            {stepMode !== 'education' && (
              <div className="md:col-span-1">
                <FlagDisplay
                  flag={
                    activeTool === 'terminal'
                      ? buildTerminalFlag(terminalDiscoveries)
                      : uartConnected
                        ? uartFlag
                        : flag
                  }
                />
              </div>
            )}
          </div>

          <div className="border-2 border-dashed border-gray-500 rounded-lg p-4 relative">
            {!isSimulatorEnabled && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <p className="text-gray-400 text-lg">Clicca su "Start" per iniziare</p>
              </div>
            )}
            <PCBViewer />
          </div>
        </div>
      </div>

      {activeTool === 'terminal' && (
        <div className="fixed inset-x-0 top-0 bottom-[40%] z-35 bg-black/10" />
      )}
      {activeTool === 'terminal' && uartConnected && <Terminal />}
      {activeTool === 'terminal' && !uartConnected && (
        <div className="fixed bottom-0 left-0 right-0 h-2/5 bg-black/95 backdrop-blur-sm z-40 text-white font-mono text-sm flex items-center justify-center border-t border-red-900/50">
          <div className="text-center">
            <p className="text-yellow-400 font-bold text-base">Nessuna connessione UART</p>
            <p className="text-gray-400 mt-2">Collega le sonde dall&apos;adattatore USB-to-Serial ai pin UART prima di aprire il terminale.</p>
          </div>
        </div>
      )}
    </main>
  );
}
