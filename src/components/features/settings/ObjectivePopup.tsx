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
  const [name, setName] = useState(objective.name);
  const [instruction, setInstruction] = useState(objective.instruction);
  const [hint, setHint] = useState(objective.hint);
  const [flagPart, setFlagPart] = useState(objective.flagPart);
  const [conditions, setConditions] = useState<PinCondition[]>(objective.pinConditions);
  const [pinLogic, setPinLogic] = useState<'AND' | 'OR'>(objective.pinLogic);

  useEffect(() => {
    setName(objective.name);
    setInstruction(objective.instruction);
    setHint(objective.hint);
    setFlagPart(objective.flagPart);
    setConditions(objective.pinConditions);
    setPinLogic(objective.pinLogic);
  }, [objective]);

  const updateConditionTerminal = (pinId: string, terminal: string) => {
    setConditions(prev => prev.map(c => c.pinId === pinId ? { ...c, terminal } : c));
  };

  const handleConfirm = () => {
    const data = {
      name,
      pinConditions: conditions,
      pinLogic,
      instruction,
      hint,
      flagPart: flagPart || name.toUpperCase().replace(/\s+/g, '_'),
      customToolId: '',
      bootStageConditions: [],
      requiresUart: false,
      terminalPersistent: false,
    };
    if (isNew) {
      saveObjective(data);
    } else {
      updateObjective(objective.id, data);
    }
  };

  // Positioning: keep popup inside image bounds with scrollbar if needed
  const hasCoords = objective.type === 'component' && objective.coords[2] > 0 && objective.coords[3] > 0;
  const popupWidth = 320;
  const popupMaxHeight = Math.min(350, containerDims.height - 16);

  let posX: number;
  let posY: number;

  if (hasCoords) {
    const [left, top, width, height] = objective.coords;
    const compRightPx = ((left + width) / 100) * containerDims.width;
    const compTopPx = (top / 100) * containerDims.height;
    const compLeftPx = (left / 100) * containerDims.width;
    const spaceRight = containerDims.width - compRightPx;

    if (spaceRight >= popupWidth + 16) {
      // Prefer right side
      posX = Math.min(compRightPx + 12, containerDims.width - popupWidth - 8);
    } else if (compLeftPx >= popupWidth + 16) {
      // Try left side
      posX = Math.max(8, compLeftPx - popupWidth - 12);
    } else {
      // Center it, ensuring it stays within bounds
      posX = Math.max(8, Math.min((containerDims.width - popupWidth) / 2, containerDims.width - popupWidth - 8));
    }
    posY = Math.max(8, Math.min(compTopPx, containerDims.height - popupMaxHeight - 8));
  } else {
    // Center it for pin-type objectives
    posX = Math.max(8, Math.min((containerDims.width - popupWidth) / 2, containerDims.width - popupWidth - 8));
    posY = Math.max(8, Math.min(containerDims.height / 2 - 175, containerDims.height - popupMaxHeight - 8));
  }

  return (
    <div
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 text-white shadow-2xl ring-1 ring-white/10 z-40 pointer-events-auto overflow-y-auto"
      style={{ left: posX, top: posY, width: popupWidth, maxHeight: popupMaxHeight }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Type badge + Coordinates */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_COLORS[objective.type] || TYPE_COLORS.component}`}>
          {objective.type === 'pin' ? 'PIN' : 'COM'}
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-400">Condizioni</label>
            <div className="flex rounded overflow-hidden border border-gray-600">
              <button
                type="button"
                onClick={() => setPinLogic('AND')}
                className={`px-2 py-0.5 text-[10px] font-mono transition-colors ${pinLogic === 'AND' ? 'bg-cyan-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'}`}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => setPinLogic('OR')}
                className={`px-2 py-0.5 text-[10px] font-mono transition-colors ${pinLogic === 'OR' ? 'bg-cyan-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'}`}
              >
                OR
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {conditions.map((cond, idx) => {
              const pin = pins.find(p => p.id === cond.pinId);
              const pinLabel = pin?.label || pin?.pinType.toUpperCase() || cond.pinId;
              return (
                <div key={cond.pinId}>
                  {idx > 0 && (
                    <div className="flex justify-center -my-0.5">
                      <span className="text-[10px] font-mono text-cyan-400/60">{pinLogic}</span>
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

      {/* Title */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Titolo</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome dell'obiettivo..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
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
          placeholder={name ? name.toUpperCase().replace(/\s+/g, '_') : 'auto da nome'}
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
