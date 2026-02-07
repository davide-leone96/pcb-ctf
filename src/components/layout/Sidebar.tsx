// src/components/layout/Sidebar.tsx

'use client';

import { useState } from 'react';
import ToolButton from '@/components/layout/exercise/ToolButton';
import FlagUnlockDialog from '@/components/features/exercise/FlagUnlockDialog';
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
  const {
    activeTool, setActiveTool,
    multimeterUnlocked, uartUnlocked, terminalUnlocked,
    lensVisible, toggleLensVisible
  } = useExerciseStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogToolId, setDialogToolId] = useState<'multimeter' | 'probes' | 'terminal'>('multimeter');
  const [dialogToolName, setDialogToolName] = useState('');

  return (
    <aside className="flex flex-col items-center gap-y-4 rounded-lg bg-gray-800 p-4">
      <h2 className="sr-only">Barra degli Strumenti</h2>

      {tools.map((tool) => {
        // Determina se il tool è bloccato
        let isLocked = false;
        if (tool.id === 'multimeter' && !multimeterUnlocked) isLocked = true;
        if (tool.id === 'probes' && !uartUnlocked) isLocked = true;
        if (tool.id === 'terminal' && !terminalUnlocked) isLocked = true;

        const isMagnifier = tool.id === 'magnifier';
        const isActive = isMagnifier ? lensVisible : activeTool === tool.id;

        const handleClick = () => {
          // Se il tool è bloccato, mostra il dialog per inserire la flag
          if (isLocked) {
            if (tool.id === 'multimeter' || tool.id === 'probes' || tool.id === 'terminal') {
              setDialogToolId(tool.id);
              setDialogToolName(tool.label);
              setDialogOpen(true);
            }
            return;
          }

          if (isMagnifier) {
            toggleLensVisible();
          } else {
            setActiveTool(tool.id);
          }
        };

        return (
          <div key={tool.id} className="relative">
            <ToolButton
              label={
                isLocked
                  ? tool.id === 'terminal'
                    ? `${tool.label} (sblocca con flag UART)`
                    : `${tool.label} (sblocca con flag)`
                  : tool.label
              }
              icon={tool.icon}
              isActive={isActive}
              onClick={handleClick}
            />
            {isLocked && (
              <div className="absolute -bottom-1 -right-1 rounded-full bg-yellow-600 p-0.5">
                <Lock className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        );
      })}

      {/* Dialog per inserimento flag e sblocco tool */}
      <FlagUnlockDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        toolId={dialogToolId}
        toolName={dialogToolName}
      />
    </aside>
  );
};

export default Sidebar;