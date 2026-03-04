// src/components/features/settings/TerminalObjectivePopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftObjective } from '@/store/settingsStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import { Button } from '@/components/ui/button';
import { TerminalSquare } from 'lucide-react';

interface TerminalObjectivePopupProps {
  objective: DraftObjective;
  containerDims: { width: number; height: number };
}

const TerminalObjectivePopup = ({ objective, containerDims }: TerminalObjectivePopupProps) => {
  const { saveObjective, updateObjective, cancelObjectiveEdit } = useSettingsStore();
  const { flagParts, completeFlag } = useTerminalSettingsStore();

  const isNew = objective.instruction === '' && objective.hint === '' && objective.flagPart === '';

  const [name, setName] = useState(objective.name);
  const [instruction, setInstruction] = useState(objective.instruction);
  const [hint, setHint] = useState(objective.hint);
  // Flatten existing bootStageConditions into a simple list of required flag IDs
  const [requiredFlags, setRequiredFlags] = useState<string[]>(
    objective.bootStageConditions.flatMap(c => c.unlockedFlags)
  );

  useEffect(() => {
    setName(objective.name);
    setInstruction(objective.instruction);
    setHint(objective.hint);
    setRequiredFlags(objective.bootStageConditions.flatMap(c => c.unlockedFlags));
  }, [objective]);

  const toggleFlag = (flagId: string) => {
    setRequiredFlags(prev =>
      prev.includes(flagId) ? prev.filter(f => f !== flagId) : [...prev, flagId]
    );
  };

  const handleConfirm = () => {
    const data = {
      name,
      pinConditions: [],
      pinLogic: 'AND' as const,
      instruction,
      hint,
      flagPart: completeFlag || flagParts.map(fp => fp.part).join('') || 'TERMINAL',
      bootStageConditions: requiredFlags.length > 0
        ? [{ bootStageId: 'completion', unlockedFlags: requiredFlags, hint: '' }]
        : [],
    };
    if (isNew) {
      saveObjective(data);
    } else {
      updateObjective(objective.id, data);
    }
  };

  // Centered positioning (terminal objectives have no canvas coords)
  const popupWidth = 340;
  const popupMaxHeight = Math.min(440, containerDims.height - 16);
  const posX = Math.max(8, Math.min((containerDims.width - popupWidth) / 2, containerDims.width - popupWidth - 8));
  const posY = Math.max(8, Math.min(containerDims.height / 2 - 220, containerDims.height - popupMaxHeight - 8));

  return (
    <div
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 text-white shadow-2xl ring-1 ring-white/10 z-40 pointer-events-auto overflow-y-auto"
      style={{ left: posX, top: posY, width: popupWidth, maxHeight: popupMaxHeight }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <TerminalSquare className="h-4 w-4 text-green-400 flex-shrink-0" />
        <span className="text-sm font-medium text-green-300">Obiettivo Terminale</span>
      </div>

      {/* Title */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Titolo</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome dell'obiettivo..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          autoFocus
        />
      </div>

      {/* Instruction */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Descrizione didattica</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Istruzione per lo studente..."
          rows={3}
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
        />
      </div>

      {/* Hint */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Hint</label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Suggerimento generale..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
        />
      </div>

      {/* Required flags for completion */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1.5">Flag richieste per completamento</label>
        {flagParts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {flagParts.map(fp => (
              <label key={fp.id} className="flex items-center gap-1.5 cursor-pointer bg-gray-700/40 hover:bg-gray-700/70 border border-gray-600/50 rounded px-2 py-1 transition-colors">
                <input
                  type="checkbox"
                  checked={requiredFlags.includes(fp.id)}
                  onChange={() => toggleFlag(fp.id)}
                  className="accent-green-500 w-3 h-3"
                />
                <span className="text-xs font-mono text-gray-300">{fp.part || fp.id}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">
            Nessun flag configurato nella tab Terminale
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancelObjectiveEdit} className="text-gray-400 hover:text-white">
          Annulla
        </Button>
        <Button size="sm" onClick={handleConfirm} className="bg-green-700 hover:bg-green-600">
          Conferma
        </Button>
      </div>
    </div>
  );
};

export default TerminalObjectivePopup;
