// src/components/features/exercise/InstructionsPanel.tsx
'use client';

import HintButton from './HintButton'; // 1. Importiamo il nuovo componente

// 2. Aggiungiamo `hintText` all'interfaccia delle props
interface InstructionsPanelProps {
  stepNumber: number;
  instruction: string;
  hintText: string;
}

const InstructionsPanel = ({
  stepNumber,
  instruction,
  hintText,
}: InstructionsPanelProps) => {
  return (
    <div className="rounded-lg bg-gray-800 p-4 text-white h-full flex flex-col">
      {/* 3. Creiamo un contenitore flex per il titolo e il pulsante */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-yellow-400">
          Step {stepNumber}: Obiettivo
        </h3>
        {/* 4. Mostriamo il pulsante solo se c'è un testo per l'hint */}
        {hintText && <HintButton hintText={hintText} />}
      </div>
      <p className="text-gray-300 flex-grow">{instruction}</p>
    </div>
  );
};

export default InstructionsPanel;