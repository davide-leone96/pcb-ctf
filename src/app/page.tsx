// src/app/page.tsx

'use client'; 

import FlagDisplay from '@/components/features/exercise/FlagDisplay';
import InstructionsPanel from '@/components/features/exercise/InstructionsPanel';
import PCBViewer from '@/components/features/exercise/PCBViewer';
import Sidebar from '@/components/layout/Sidebar';
import { exerciseData } from '@/data/exercise';
import { useExerciseStore } from '@/store/exerciseStore';

export default function Home() {
  const { currentStep, flag, isFinished } = useExerciseStore();
  const currentComponent = exerciseData.components[currentStep];
  const instruction = isFinished
    ? 'Congratulazioni! Hai identificato tutti i componenti.'
    : currentComponent?.instruction || '';
  const hint = isFinished ? '' : currentComponent?.hint || '';
  const stepNumber = isFinished ? exerciseData.components.length : currentStep + 1;

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-6 lg:p-12">
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
              <FlagDisplay flag={flag} />
            </div>
          </div>
          
          {/* Area Inferiore: Visore PCB */}
          {/* Aggiungiamo il padding qui per ripristinare lo spazio visivo */}
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-4">
            <PCBViewer />
          </div>

        </div>
      </div>
    </main>
  );
}