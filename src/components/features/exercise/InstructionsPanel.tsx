'use client';

import { useState, useRef, useEffect } from 'react';
import HintButton from './HintButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InstructionsPanelProps {
  stepMode: 'education' | 'active' | 'completed';
  stepTitle: string;
  stepDescription: string;
  objectiveName: string;
  objectiveInstruction: string;
  hintText: string;
  onStartStep: () => void;
  onNextStep: () => void;
  /** True quando l'intero esercizio è finito (nessun next step disponibile) */
  isExerciseFinished?: boolean;
}

const InstructionsPanel = ({
  stepMode,
  stepTitle,
  stepDescription,
  objectiveName,
  objectiveInstruction,
  hintText,
  onStartStep,
  onNextStep,
  isExerciseFinished = false,
}: InstructionsPanelProps) => {
  const [showMoreDialog, setShowMoreDialog] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const isOverflowing = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setHasOverflow(isOverflowing);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [stepDescription, objectiveInstruction, stepMode]);

  if (stepMode === 'education') {
    return (
      <>
        <div className="rounded-lg bg-gray-800 p-4 text-white h-full flex flex-col relative">
          <h3 className="text-lg font-bold text-yellow-400 mb-3">
            {stepTitle}
          </h3>
          <div
            ref={contentRef}
            className="text-gray-300 flex-grow overflow-hidden relative"
            style={{ maxHeight: '12rem' }}
          >
            <p className="leading-relaxed">{stepDescription}</p>
            {hasOverflow && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none" />
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={onStartStep}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Start
            </Button>
            {hasOverflow && (
              <Button
                onClick={() => setShowMoreDialog(true)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                More
              </Button>
            )}
          </div>
        </div>

        <Dialog open={showMoreDialog} onOpenChange={setShowMoreDialog}>
          <DialogContent className="bg-gray-800 text-white border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-yellow-400 text-xl">
                {stepTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="text-gray-300 leading-relaxed mt-4">
              {stepDescription}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (stepMode === 'completed') {
    return (
      <div className="rounded-lg bg-gray-800 p-4 text-white h-full flex flex-col">
        <h3 className="text-lg font-bold text-green-400 mb-3">
          {isExerciseFinished
            ? 'Challenge Completed!'
            : `${stepTitle} — Completed!`}
        </h3>
        <div className="text-gray-300 flex-grow">
          {isExerciseFinished ? (
            <p className="leading-relaxed">
              Congratulations! You have successfully completed the entire challenge.
            </p>
          ) : (
            <>
              <p className="leading-relaxed mb-4">
                Congratulations! You have completed all objectives for this step.
              </p>
              <p className="leading-relaxed">
                Copy the flag from the panel on the right and click &quot;Next&quot; to proceed to the next step.
              </p>
            </>
          )}
        </div>
        {!isExerciseFinished && (
          <div className="mt-4">
            <Button
              onClick={onNextStep}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-800 p-4 text-white h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-yellow-400">
          {objectiveName}
        </h3>
        {hintText && <HintButton hintText={hintText} />}
      </div>
      <p className="text-gray-300 flex-grow">{objectiveInstruction}</p>
    </div>
  );
};

export default InstructionsPanel;
