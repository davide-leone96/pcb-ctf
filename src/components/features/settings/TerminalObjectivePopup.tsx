// src/components/features/settings/TerminalObjectivePopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftObjective, type BootStageCondition } from '@/store/settingsStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import { Button } from '@/components/ui/button';
import { TerminalSquare, Plus, Trash2 } from 'lucide-react';

interface TerminalObjectivePopupProps {
  objective: DraftObjective;
  containerDims: { width: number; height: number };
}

const TerminalObjectivePopup = ({ objective, containerDims }: TerminalObjectivePopupProps) => {
  const { saveObjective, updateObjective, cancelObjectiveEdit } = useSettingsStore();
  const { bootStages, flagParts, completeFlag } = useTerminalSettingsStore();

  const isNew = objective.instruction === '' && objective.hint === '' && objective.flagPart === '';

  const [instruction, setInstruction] = useState(objective.instruction);
  const [hint, setHint] = useState(objective.hint);
  const [conditions, setConditions] = useState<BootStageCondition[]>(objective.bootStageConditions);

  useEffect(() => {
    setInstruction(objective.instruction);
    setHint(objective.hint);
    setConditions(objective.bootStageConditions);
  }, [objective]);

  const addedStageIds = new Set(conditions.map(c => c.bootStageId));
  const availableStages = bootStages.filter(s => !addedStageIds.has(s.id));

  const addCondition = (stageId: string) => {
    setConditions(prev => [...prev, { bootStageId: stageId, unlockedFlags: [], hint: '' }]);
  };

  const removeCondition = (stageId: string) => {
    setConditions(prev => prev.filter(c => c.bootStageId !== stageId));
  };

  const toggleFlag = (stageId: string, flagId: string) => {
    setConditions(prev => prev.map(c => {
      if (c.bootStageId !== stageId) return c;
      const has = c.unlockedFlags.includes(flagId);
      return {
        ...c,
        unlockedFlags: has ? c.unlockedFlags.filter(f => f !== flagId) : [...c.unlockedFlags, flagId],
      };
    }));
  };

  const updateConditionHint = (stageId: string, value: string) => {
    setConditions(prev => prev.map(c => c.bootStageId === stageId ? { ...c, hint: value } : c));
  };

  const handleConfirm = () => {
    const data = {
      name: objective.name,
      pinConditions: [],
      pinLogic: 'AND' as const,
      instruction,
      hint,
      flagPart: completeFlag || flagParts.map(fp => fp.part).join('') || 'TERMINAL',
      bootStageConditions: conditions,
    };
    if (isNew) {
      saveObjective(data);
    } else {
      updateObjective(objective.id, data);
    }
  };

  // Centered positioning (terminal objectives have no canvas coords)
  const popupWidth = 340;
  const popupMaxHeight = Math.min(480, containerDims.height - 16);
  const posX = Math.max(8, Math.min((containerDims.width - popupWidth) / 2, containerDims.width - popupWidth - 8));
  const posY = Math.max(8, Math.min(containerDims.height / 2 - 240, containerDims.height - popupMaxHeight - 8));

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
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded border bg-green-600/30 text-green-300 border-green-500/50">
          {objective.name}
        </span>
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
          autoFocus
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

      {/* Flag (read-only — derivata dalla config terminale) */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Flag terminale</label>
        {completeFlag || flagParts.length > 0 ? (
          <div className="w-full bg-gray-800/60 border border-gray-700 rounded px-2 py-1.5 text-sm font-mono text-green-300 break-all">
            {completeFlag || flagParts.map(fp => fp.part).join('')}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">
            Nessuna flag configurata nella tab Terminale
          </p>
        )}
      </div>

      {/* Boot Stage Conditions */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Fasi di boot ({conditions.length})</label>
          {availableStages.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors px-1.5 py-0.5 rounded bg-green-900/20 hover:bg-green-900/40">
                <Plus className="h-3 w-3" />
                Aggiungi
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl z-50 min-w-[160px] hidden group-focus-within:block group-hover:block">
                {availableStages.map(stage => (
                  <button
                    key={stage.id}
                    onClick={() => addCondition(stage.id)}
                    className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-gray-700 transition-colors first:rounded-t last:rounded-b"
                  >
                    {stage.name || stage.id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {conditions.length === 0 && (
          <p className="text-xs text-gray-500 italic text-center py-2">
            Nessuna fase aggiunta
          </p>
        )}

        <div className="space-y-2">
          {conditions.map(cond => {
            const stage = bootStages.find(s => s.id === cond.bootStageId);
            return (
              <div key={cond.bootStageId} className="bg-gray-700/30 rounded p-2 border border-gray-600/50">
                {/* Stage header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-green-300">{stage?.name || cond.bootStageId}</span>
                  <button
                    onClick={() => removeCondition(cond.bootStageId)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Flag checkboxes */}
                {flagParts.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] text-gray-500 block mb-1">Flag sbloccate</span>
                    <div className="flex flex-wrap gap-1.5">
                      {flagParts.map(fp => (
                        <label key={fp.id} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cond.unlockedFlags.includes(fp.id)}
                            onChange={() => toggleFlag(cond.bootStageId, fp.id)}
                            className="accent-green-500 w-3 h-3"
                          />
                          <span className="text-[10px] font-mono text-gray-300">{fp.part || fp.id}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-stage hint */}
                <div>
                  <span className="text-[10px] text-gray-500 block mb-1">Hint fase</span>
                  <input
                    type="text"
                    value={cond.hint}
                    onChange={(e) => updateConditionHint(cond.bootStageId, e.target.value)}
                    placeholder="Suggerimento per questa fase..."
                    className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
            );
          })}
        </div>
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
