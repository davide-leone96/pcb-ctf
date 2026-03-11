// src/components/layout/Sidebar.tsx

'use client';

import ToolButton from '@/components/layout/exercise/ToolButton';
import { Hand, Search, Wrench, Cable, HardDrive, type LucideIcon } from 'lucide-react';
import { useExerciseStore, Tool } from '@/store/exerciseStore';

const tools: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: 'pointer', label: 'Pointer', icon: Hand },
  { id: 'magnifier', label: 'Magnifier', icon: Search },
  { id: 'multimeter', label: 'Multimeter', icon: Wrench },
  { id: 'probes', label: 'UART Connection', icon: Cable },
  { id: 'firmware-dump', label: 'Firmware Dump', icon: HardDrive },
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

  return (
    <aside className="flex flex-col items-center gap-y-4 rounded-lg bg-gray-800 p-4">
      <h2 className="sr-only">Toolbar</h2>

      {visibleTools.map((tool) => {
        const isMagnifier = tool.id === 'magnifier';
        const isActive = isMagnifier ? lensVisible : activeTools.includes(tool.id);

        const handleClick = () => {
          if (isMagnifier) {
            toggleLensVisible();
          } else {
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
