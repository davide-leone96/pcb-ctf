'use client'; 

import FlagDisplay from '@/components/features/exercise/FlagDisplay';
import InstructionsPanel from '@/components/features/exercise/InstructionsPanel';
import PCBViewer from '@/components/features/exercise/PCBViewer';
import Sidebar from '@/components/layout/Sidebar';
import { exerciseData } from '@/data/exercise';
import { buildTerminalFlag } from '@/data/terminalData';
import { useExerciseStore } from '@/store/exerciseStore';
import CompletionDialog from '@/components/features/exercise/CompletionDialog';
import Terminal from '@/components/features/exercise/Terminal';

export default function Home() {
  // --- 2. Estrai 'isFinished', 'flag', e 'resetExercise' dallo store ---
  const { currentStep, flag, isFinished, resetExercise, activeTool, terminalDiscoveries, uartConnected } = useExerciseStore();
  
  const currentComponent = exerciseData.components[currentStep];
  const instruction = isFinished
    ? 'Congratulazioni! Hai identificato tutti i componenti.'
    : currentComponent?.instruction || '';
  const hint = isFinished ? '' : currentComponent?.hint || '';
  const stepNumber = isFinished ? exerciseData.components.length : currentStep + 1;

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-6 lg:p-12">
      {/* --- 3. Aggiungi il componente del dialogo qui --- */}
      <CompletionDialog isOpen={isFinished} flag={flag} onReset={resetExercise} />

      <h1 className="mb-8 text-3xl font-bold text-white">
        ARTIC Web Platform
      </h1>
      <div className="flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-grow flex-col gap-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <InstructionsPanel
                stepNumber={stepNumber}
                instruction={instruction}
                hintText={hint}
              />
            </div>
            <div className="md:col-span-1">
              <FlagDisplay flag={activeTool === 'terminal' ? buildTerminalFlag(terminalDiscoveries) : flag} />
            </div>
          </div>
          
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-4">
            <PCBViewer />
          </div>

        </div>
      </div>
      {/* Overlay di blocco: disabilita sidebar e PCB quando il terminale è aperto */}
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