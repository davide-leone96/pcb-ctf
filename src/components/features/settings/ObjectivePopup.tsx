// src/components/features/settings/ObjectivePopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftObjective, type PinCondition } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';

const TERMINAL_OPTIONS = [
  { value: '', label: 'Seleziona terminale...' },
  { value: 'probe1', label: 'Multimetro - Puntale 1' },
  { value: 'probe2', label: 'Multimetro - Puntale 2' },
  { value: 'adapter-tx', label: 'UART Adapter - TX' },
  { value: 'adapter-rx', label: 'UART Adapter - RX' },
  { value: 'adapter-gnd', label: 'UART Adapter - GND' },
];

const TYPE_COLORS: Record<string, string> = {
  component: 'bg-blue-600/30 text-blue-300 border-blue-500/50',
  pin: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50',
};

interface ObjectivePopupProps {
  objective: DraftObjective;
  containerDims: { width: number; height: number };
}

const ObjectivePopup = ({ objective, containerDims }: ObjectivePopupProps) => {
  const { saveObjective, updateObjective, cancelObjectiveEdit, pins } = useSettingsStore();

  const isNew = objective.instruction === '' && objective.hint === '' && objective.flagPart === '';
  const [instruction, setInstruction] = useState(objective.instruction);
  const [hint, setHint] = useState(objective.hint);
  const [flagPart, setFlagPart] = useState(objective.flagPart);
  const [conditions, setConditions] = useState<PinCondition[]>(objective.pinConditions);

  useEffect(() => {
    setInstruction(objective.instruction);
    setHint(objective.hint);
    setFlagPart(objective.flagPart);
    setConditions(objective.pinConditions);
  }, [objective]);

  const updateConditionTerminal = (pinId: string, terminal: string) => {
    setConditions(prev => prev.map(c => c.pinId === pinId ? { ...c, terminal } : c));
  };

  const handleConfirm = () => {
    const data = {
      name: objective.name,
      pinConditions: conditions,
      pinLogic: objective.pinLogic,
      instruction,
      hint,
      flagPart: flagPart || objective.name.toUpperCase().replace(/\s+/g, '_'),
    };
    if (isNew) {
      saveObjective(data);
    } else {
      updateObjective(objective.id, data);
    }
  };

  // Positioning: use coords if component type with area, otherwise center
  const hasCoords = objective.type === 'component' && objective.coords[2] > 0 && objective.coords[3] > 0;
  const popupWidth = 320;

  let posX: number;
  let posY: number;

  if (hasCoords) {
    const [left, top, width, height] = objective.coords;
    const compRightPx = ((left + width) / 100) * containerDims.width;
    const compTopPx = (top / 100) * containerDims.height;
    const spaceRight = containerDims.width - compRightPx;
    const compLeftPx = (left / 100) * containerDims.width;

    if (spaceRight >= popupWidth + 16) {
      posX = compRightPx + 12;
    } else if (compLeftPx >= popupWidth + 16) {
      posX = compLeftPx - popupWidth - 12;
    } else {
      posX = Math.max(8, (containerDims.width - popupWidth) / 2);
    }
    posY = Math.max(8, Math.min(compTopPx, containerDims.height - 350));
  } else {
    posX = Math.max(8, (containerDims.width - popupWidth) / 2);
    posY = Math.max(8, containerDims.height / 2 - 175);
  }

  return (
    <div
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 text-white shadow-2xl ring-1 ring-white/10 z-40 pointer-events-auto"
      style={{ left: posX, top: posY, width: popupWidth }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Component name + Coordinates */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_COLORS[objective.type] || TYPE_COLORS.component}`}>
          {objective.name || 'Componente'}
        </span>
        {hasCoords && (
          <span className="text-xs font-mono text-gray-400">
            [{objective.coords[0].toFixed(1)}, {objective.coords[1].toFixed(1)}, {objective.coords[2].toFixed(1)}, {objective.coords[3].toFixed(1)}]%
          </span>
        )}
      </div>

      {/* Pin conditions */}
      {objective.type === 'pin' && conditions.length > 0 && (
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1.5">
            Condizioni ({objective.pinLogic})
          </label>
          <div className="space-y-1.5">
            {conditions.map((cond, idx) => {
              const pin = pins.find(p => p.id === cond.pinId);
              const pinLabel = pin?.label || pin?.pinType.toUpperCase() || cond.pinId;
              return (
                <div key={cond.pinId}>
                  {idx > 0 && (
                    <div className="flex justify-center -my-0.5">
                      <span className="text-[10px] font-mono text-cyan-400/60">{objective.pinLogic}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-gray-700/30 rounded px-2 py-1.5">
                    <span className="text-xs text-cyan-300 flex-shrink-0 min-w-[50px]">{pinLabel}</span>
                    <span className="text-[10px] text-gray-500">&rarr;</span>
                    <select
                      value={cond.terminal}
                      onChange={(e) => updateConditionTerminal(cond.pinId, e.target.value)}
                      className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      {TERMINAL_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instruction */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Descrizione didattica</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Istruzione per lo studente..."
          rows={3}
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
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
          placeholder="Suggerimento per lo studente..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Flag Part */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Flag Part</label>
        <input
          type="text"
          value={flagPart}
          onChange={(e) => setFlagPart(e.target.value)}
          placeholder={objective.name ? objective.name.toUpperCase().replace(/\s+/g, '_') : 'auto da nome'}
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancelObjectiveEdit} className="text-gray-400 hover:text-white">
          Annulla
        </Button>
        <Button size="sm" onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
          Conferma
        </Button>
      </div>
    </div>
  );
};

export default ObjectivePopup;
