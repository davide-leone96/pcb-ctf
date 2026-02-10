// src/components/features/settings/ObjectivePopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftObjective } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';

const TYPE_LABELS: Record<string, string> = {
  component: 'Componente',
  uart: 'UART',
  terminal: 'Terminale',
};

const TYPE_COLORS: Record<string, string> = {
  component: 'bg-blue-600/30 text-blue-300 border-blue-500/50',
  uart: 'bg-green-600/30 text-green-300 border-green-500/50',
  terminal: 'bg-purple-600/30 text-purple-300 border-purple-500/50',
};

interface ObjectivePopupProps {
  objective: DraftObjective;
  containerDims: { width: number; height: number };
}

const ObjectivePopup = ({ objective, containerDims }: ObjectivePopupProps) => {
  const { saveObjective, updateObjective, cancelObjectiveEdit } = useSettingsStore();

  const isNew = objective.name === '';
  const [name, setName] = useState(objective.name);
  const [instruction, setInstruction] = useState(objective.instruction);
  const [hint, setHint] = useState(objective.hint);
  const [flagPart, setFlagPart] = useState(objective.flagPart);

  useEffect(() => {
    setName(objective.name);
    setInstruction(objective.instruction);
    setHint(objective.hint);
    setFlagPart(objective.flagPart);
  }, [objective]);

  const handleConfirm = () => {
    const data = {
      name: name || 'Obiettivo',
      instruction,
      hint,
      flagPart: flagPart || name.toUpperCase().replace(/\s+/g, '_'),
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
      {/* Type badge + Coordinates */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_COLORS[objective.type]}`}>
          {TYPE_LABELS[objective.type]}
        </span>
        {hasCoords && (
          <span className="text-xs font-mono text-gray-400">
            [{objective.coords[0].toFixed(1)}, {objective.coords[1].toFixed(1)}, {objective.coords[2].toFixed(1)}, {objective.coords[3].toFixed(1)}]%
          </span>
        )}
      </div>

      {/* Name */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Nome obiettivo</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. CPU, ROM, UART..."
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
