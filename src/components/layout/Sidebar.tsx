// src/components/layout/Sidebar.tsx

'use client';

import ToolButton from '@/components/layout/exercise/ToolButton';
import { Hand, Search, Wrench, TerminalSquare, type LucideIcon } from 'lucide-react'; 
import { useExerciseStore, Tool } from '@/store/exerciseStore';

const tools: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: 'pointer', label: 'Puntatore', icon: Hand },
  { id: 'magnifier', label: "Lente d'ingrandimento", icon: Search },
  { id: 'multimeter', label: 'Multimetro', icon: Wrench },
  { id: 'terminal', label: 'Terminale', icon: TerminalSquare },
];

const Sidebar = () => {
  const { activeTool, setActiveTool } = useExerciseStore();

  return (
    <aside className="flex flex-col items-center gap-y-4 rounded-lg bg-gray-800 p-4">
      <h2 className="sr-only">Barra degli Strumenti</h2>

      {tools.map((tool) => (
        <ToolButton
          key={tool.id}
          label={tool.label}
          icon={tool.icon}
          isActive={activeTool === tool.id}
          onClick={() => setActiveTool(tool.id)}
        />
      ))}
    </aside>
  );
};

export default Sidebar;