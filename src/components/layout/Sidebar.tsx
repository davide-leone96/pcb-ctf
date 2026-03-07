// src/components/layout/Sidebar.tsx

'use client';

import ToolButton from '@/components/layout/exercise/ToolButton';
import { Hand, Search, Wrench, Cable, TerminalSquare, type LucideIcon } from 'lucide-react';
import { useExerciseStore, Tool } from '@/store/exerciseStore';

const tools: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: 'pointer', label: 'Puntatore', icon: Hand },
  { id: 'magnifier', label: "Lente d'ingrandimento", icon: Search },
  { id: 'multimeter', label: 'Multimetro', icon: Wrench },
  { id: 'probes', label: 'Connessione UART', icon: Cable },
  { id: 'terminal', label: 'Terminale', icon: TerminalSquare },
];

const Sidebar = () => {
  const {
    activeTool, activeTools, setActiveTool,
    lensVisible, toggleLensVisible,
    exerciseData, currentStepIndex,
  } = useExerciseStore();

  const currentStep = exerciseData?.steps?.[currentStepIndex];
  const availableTools = currentStep?.availableTools;
  const visibleTools = availableTools?.length
    ? tools.filter(t => availableTools.includes(t.id))
    : tools;

  // Il terminale non può essere disattivato se toolConfig.terminal.persistent oppure
  // se un obiettivo terminal ha terminalPersistent (retrocompatibilità)
  const terminalPersistent = exerciseData?.toolConfig?.terminal?.persistent ??
    (exerciseData?.steps.some(s =>
      s.objectives.some(o => o.type === 'terminal' && o.terminalPersistent)
    ) ?? false);

  return (
    <aside className="flex flex-col items-center gap-y-4 rounded-lg bg-gray-800 p-4">
      <h2 className="sr-only">Barra degli Strumenti</h2>

      {visibleTools.map((tool) => {
        const isMagnifier = tool.id === 'magnifier';
        const isActive = isMagnifier ? lensVisible : activeTools.includes(tool.id);

        const handleClick = () => {
          if (isMagnifier) {
            toggleLensVisible();
          } else {
            // Se il terminale è persistente e attivo, blocca disattivazione e cambio tool
            if (terminalPersistent && activeTools.includes('terminal')) {
              if (tool.id !== 'terminal') return; // non può cambiare tool
              return; // non può disattivare il terminale
            }
            setActiveTool(tool.id);
          }
        };

        return (
          <ToolButton
            key={tool.id}
            label={tool.label}
            icon={tool.icon}
            isActive={isActive}
            onClick={handleClick}
          />
        );
      })}
    </aside>
  );
};

export default Sidebar;
