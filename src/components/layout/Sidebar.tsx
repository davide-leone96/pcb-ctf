// src/components/layout/Sidebar.tsx

'use client';

import ToolButton from '@/components/layout/exercise/ToolButton';
import { Hand, Search, Wrench, Cable, TerminalSquare, Lock, type LucideIcon } from 'lucide-react';
import { useExerciseStore, Tool } from '@/store/exerciseStore';

const tools: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: 'pointer', label: 'Puntatore', icon: Hand },
  { id: 'magnifier', label: "Lente d'ingrandimento", icon: Search },
  { id: 'multimeter', label: 'Multimetro', icon: Wrench },
  { id: 'probes', label: 'Connessione UART', icon: Cable },
  { id: 'terminal', label: 'Terminale', icon: TerminalSquare },
];

const Sidebar = () => {
  const { activeTool, setActiveTool, uartConnected } = useExerciseStore();

  return (
    <aside className="flex flex-col items-center gap-y-4 rounded-lg bg-gray-800 p-4">
      <h2 className="sr-only">Barra degli Strumenti</h2>

      {tools.map((tool) => {
        const isLocked = tool.id === 'terminal' && !uartConnected;
        return (
          <div key={tool.id} className="relative">
            <ToolButton
              label={isLocked ? `${tool.label} (collega UART)` : tool.label}
              icon={tool.icon}
              isActive={activeTool === tool.id}
              onClick={() => !isLocked && setActiveTool(tool.id)}
            />
            {isLocked && (
              <div className="absolute -bottom-1 -right-1 rounded-full bg-yellow-600 p-0.5">
                <Lock className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
};

export default Sidebar;