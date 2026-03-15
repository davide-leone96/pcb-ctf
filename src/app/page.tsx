'use client';

import { useState, useEffect, useRef } from 'react';
import FlagDisplay from '@/components/features/exercise/FlagDisplay';
import InstructionsPanel from '@/components/features/exercise/InstructionsPanel';
import PCBViewer from '@/components/features/exercise/PCBViewer';
import Sidebar from '@/components/layout/Sidebar';
import { useExerciseStore } from '@/store/exerciseStore';
import CompletionDialog from '@/components/features/exercise/CompletionDialog';
import StepCompletionDialog from '@/components/features/exercise/StepCompletionDialog';
import Terminal from '@/components/features/exercise/Terminal';
import { useExerciseConfig } from '@/hooks/useExerciseConfig';
import { TERMINAL_STORAGE_KEY } from '@/store/terminalSettingsStore';

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
    activeTerminalComponentId,
    activeTerminalDefaultTab,
    terminalCurrentFlag,
    terminalCompleteFlag,
    terminalChallengeCompleted,
    terminalObjectiveDescription,
    terminalObjectiveHint,
  } = useExerciseStore();

  useEffect(() => {
    if (!isLoading) {
      setExerciseData(exerciseData);
    }
  }, [isLoading, exerciseData, setExerciseData]);

  // Auto-sync terminal config from active preset on mount.
  // This ensures file-level edits to presets are reflected in the simulator
  // without requiring a manual reload from the Settings UI.
  const presetSynced = useRef(false);
  useEffect(() => {
    if (presetSynced.current) return;
    const activePresetId = localStorage.getItem('pcb-ctf-active-preset');
    if (!activePresetId) return;
    presetSynced.current = true;
    fetch(`/api/presets/${activePresetId}`)
      .then(r => r.json())
      .then(result => {
        if (!result.success) return;
        const tc = result.data.terminalConfig;
        if (tc) {
          localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(
            Array.isArray(tc) ? tc : [{ id: 'default', name: 'Terminal', config: tc }]
          ));
          window.dispatchEvent(new Event('terminal-config-updated'));
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading configuration...</div>
      </main>
    );
  }

  if (!exerciseData.steps || exerciseData.steps.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl text-center">
          <p className="text-red-400 mb-4">Error: Invalid exercise configuration</p>
          <p className="text-gray-400 text-sm">The step structure was not found.</p>
        </div>
      </main>
    );
  }

  const currentStep = exerciseData.steps[currentStepIndex];
  const currentObjective = currentStep?.objectives?.[currentObjectiveIndex];

  // Build combined progressive flag when terminal is active or was recently completed
  const buildDisplayFlag = (): string => {
    // When step is completed, show the final exercise flag (includes terminal part)
    if (stepMode !== 'active') return flag;

    // If no terminal involved, show the store flag directly
    if (!activeTerminalComponentId && !terminalCompleteFlag) return flag;

    // If terminal was completed and closed (fw-probe flow), the store flag
    // was already updated by completeTerminalChallenge — use it directly
    if (!activeTerminalComponentId && terminalChallengeCompleted) return flag;

    // During active step with terminal: combine objective flagParts + terminal progress
    let objectiveParts = '';
    for (let i = 0; i <= currentObjectiveIndex; i++) {
      objectiveParts += currentStep?.objectives?.[i]?.flagPart || '';
    }

    // Show progressive terminal flag (discovered parts shown, rest as ?)
    let terminalInner = '';
    if (terminalChallengeCompleted) {
      const completeMatch = terminalCompleteFlag.match(/^flag\{(.+)\}$/);
      terminalInner = completeMatch ? completeMatch[1] : terminalCompleteFlag;
    } else if (terminalCurrentFlag) {
      const match = terminalCurrentFlag.match(/^flag\{(.+)\}$/);
      terminalInner = match ? match[1] : terminalCurrentFlag;
    } else {
      terminalInner = '?'.repeat(terminalCompleteFlag.length || 4);
    }

    return terminalCompleteFlag
      ? `flag{${objectiveParts}_${terminalInner}}`
      : flag;
  };

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
      {exerciseData.completionDialog && (
        <CompletionDialog isOpen={isFinished} flag={flag} onReset={resetExercise} config={exerciseData.completionDialog} />
      )}

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
                objectiveName={
                  activeTerminalComponentId && terminalObjectiveDescription
                    ? 'Terminal Challenge'
                    : (currentObjective?.name || '')
                }
                objectiveInstruction={
                  activeTerminalComponentId && terminalObjectiveDescription
                    ? terminalObjectiveDescription
                    : (currentObjective?.instruction || '')
                }
                hintText={
                  activeTerminalComponentId && terminalObjectiveHint
                    ? terminalObjectiveHint
                    : (currentObjective?.hint || '')
                }
                onStartStep={startStep}
                onNextStep={handleNextStep}
                isExerciseFinished={isFinished}
              />
            </div>
            <div className="md:col-span-1">
              <FlagDisplay flag={buildDisplayFlag()} />
            </div>
          </div>

          {/* Row 2, Col 1: sidebar */}
          <div className="col-start-1 row-start-2 self-center relative flex-shrink-0">
            <Sidebar />
          </div>

          {/* Row 2, Col 2: contenuto principale */}
          <div className="col-start-2 row-start-2 border-2 border-dashed border-gray-500 rounded-lg p-4 relative">
            {activeTerminalComponentId ? (
              <Terminal terminalComponentId={activeTerminalComponentId} defaultTab={activeTerminalDefaultTab ?? undefined} />
            ) : (
              <PCBViewer />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
