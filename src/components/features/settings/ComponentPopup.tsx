// src/components/features/settings/ComponentPopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftComponent } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';

interface ComponentPopupProps {
  component: DraftComponent;
  /** Container dimensions for positioning */
  containerDims: { width: number; height: number };
}

const ComponentPopup = ({ component, containerDims }: ComponentPopupProps) => {
  const { saveComponent, updateComponent, cancelComponentEdit } = useSettingsStore();

  const isNew = component.name === '';
  const [name, setName] = useState(component.name);
  const [instruction, setInstruction] = useState(component.instruction);
  const [hint, setHint] = useState(component.hint);
  const [flagPart, setFlagPart] = useState(component.flagPart);

  useEffect(() => {
    setName(component.name);
    setInstruction(component.instruction);
    setHint(component.hint);
    setFlagPart(component.flagPart);
  }, [component]);

  const handleConfirm = () => {
    const data = {
      name: name || 'Componente',
      instruction,
      hint,
      flagPart: flagPart || name.toUpperCase().replace(/\s+/g, '_'),
    };
    if (isNew) {
      saveComponent(data);
    } else {
      updateComponent(component.id, data);
    }
  };

  // Position popup to the right of the component area, or left if not enough space
  const [left, top, width, height] = component.coords;
  const compRightPx = ((left + width) / 100) * containerDims.width;
  const compTopPx = (top / 100) * containerDims.height;
  const popupWidth = 320;
  const spaceRight = containerDims.width - compRightPx;
  const compLeftPx = (left / 100) * containerDims.width;

  let posX: number;
  if (spaceRight >= popupWidth + 16) {
    posX = compRightPx + 12;
  } else if (compLeftPx >= popupWidth + 16) {
    posX = compLeftPx - popupWidth - 12;
  } else {
    posX = Math.max(8, (containerDims.width - popupWidth) / 2);
  }
  const posY = Math.max(8, Math.min(compTopPx, containerDims.height - 350));

  return (
    <div
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 text-white shadow-2xl ring-1 ring-white/10 z-40 pointer-events-auto"
      style={{ left: posX, top: posY, width: popupWidth }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Coordinates badge */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400">
          [{left.toFixed(1)}, {top.toFixed(1)}, {width.toFixed(1)}, {height.toFixed(1)}]%
        </span>
      </div>

      {/* Name */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Nome componente</label>
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
        <Button variant="ghost" size="sm" onClick={cancelComponentEdit} className="text-gray-400 hover:text-white">
          Annulla
        </Button>
        <Button size="sm" onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
          Conferma
        </Button>
      </div>
    </div>
  );
};

export default ComponentPopup;
