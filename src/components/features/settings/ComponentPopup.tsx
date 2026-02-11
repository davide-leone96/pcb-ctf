// src/components/features/settings/ComponentPopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftComponent } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';

interface ComponentPopupProps {
  component: DraftComponent;
  containerDims: { width: number; height: number };
}

const ComponentPopup = ({ component, containerDims }: ComponentPopupProps) => {
  const { saveComponent, updateComponent, cancelComponentEdit } = useSettingsStore();

  const isNew = component.name === '';
  const [name, setName] = useState(component.name);

  useEffect(() => {
    setName(component.name);
  }, [component]);

  const handleConfirm = () => {
    const finalName = name || 'Componente';
    const data = {
      name: finalName,
      instruction: '',
      hint: '',
      flagPart: finalName.toUpperCase().replace(/\s+/g, '_'),
    };
    if (isNew) {
      saveComponent(data);
    } else {
      updateComponent(component.id, data);
    }
  };

  // Positioning based on coords
  const [left, top, width, height] = component.coords;
  const popupWidth = 320;
  const compRightPx = ((left + width) / 100) * containerDims.width;
  const compTopPx = (top / 100) * containerDims.height;
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
  const posY = Math.max(8, Math.min(compTopPx, containerDims.height - 180));

  return (
    <div
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 text-white shadow-2xl ring-1 ring-white/10 z-40 pointer-events-auto"
      style={{ left: posX, top: posY, width: popupWidth }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <span className="text-xs px-1.5 py-0.5 rounded border bg-green-600/30 text-green-300 border-green-500/50">
          Componente
        </span>
        <span className="text-xs font-mono text-gray-400">
          [{component.coords[0].toFixed(1)}, {component.coords[1].toFixed(1)}, {component.coords[2].toFixed(1)}, {component.coords[3].toFixed(1)}]%
        </span>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Nome componente</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. CPU, ROM, Flash..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
          autoFocus
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancelComponentEdit} className="text-gray-400 hover:text-white">
          Annulla
        </Button>
        <Button size="sm" onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
          Conferma
        </Button>
      </div>
    </div>
  );
};

export default ComponentPopup;
