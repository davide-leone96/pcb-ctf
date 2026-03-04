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
    activeTool, setActiveTool,
    lensVisible, toggleLensVisible,
    exerciseData, currentStepIndex,
    activeCustomToolId, setActiveCustomTool,
  } = useExerciseStore();

  const currentStep = exerciseData?.steps?.[currentStepIndex];
  const availableTools = currentStep?.availableTools;
  const visibleTools = availableTools?.length
    ? tools.filter(t => availableTools.includes(t.id))
    : tools;

  const customTools = exerciseData?.customTools ?? [];

  return (
    <aside className="flex flex-col items-center gap-y-4 rounded-lg bg-gray-800 p-4">
      <h2 className="sr-only">Barra degli Strumenti</h2>

      {visibleTools.map((tool) => {
        const isMagnifier = tool.id === 'magnifier';
        const isActive = isMagnifier ? lensVisible : activeTool === tool.id;

        const handleClick = () => {
          if (isMagnifier) {
            toggleLensVisible();
          } else if (tool.id === 'pointer') {
            setActiveTool('pointer');
          } else {
            if (isActive) {
              setActiveTool('pointer');
            } else {
              setActiveTool(tool.id);
            }
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

      {/* Custom tools — shown only when step allows 'custom' (or no tool restriction) */}
      {customTools.length > 0 && (!availableTools?.length || availableTools.includes('custom')) && (
        <>
          {/* Divider */}
          <div className="w-8 border-t border-gray-600" />
          {customTools.map(ct => (
            <ToolButton
              key={ct.id}
              label={ct.name}
              icon={Wrench}
              isActive={activeTool === 'custom' && activeCustomToolId === ct.id}
              onClick={() => {
                if (activeTool === 'custom' && activeCustomToolId === ct.id) {
                  setActiveTool('pointer');
                } else {
                  setActiveCustomTool(ct.id);
                }
              }}
            />
          ))}
        </>
      )}
    </aside>
  );
};

export default Sidebar;
