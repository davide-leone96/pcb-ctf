// src/components/features/settings/FirmwareDumpObjectivePopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftObjective } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';
import { HardDrive, AlertTriangle } from 'lucide-react';

interface FirmwareDumpObjectivePopupProps {
  objective: DraftObjective;
  containerDims: { width: number; height: number };
}

const FirmwareDumpObjectivePopup = ({ objective, containerDims }: FirmwareDumpObjectivePopupProps) => {
  const { saveObjective, updateObjective, cancelObjectiveEdit, toolConfig } = useSettingsStore();

  const isNew = objective.instruction === '' && objective.hint === '' && objective.flagPart === '';

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

  const fwConfig = toolConfig.firmwareDump;
  const hasConfig = fwConfig && fwConfig.probes.length > 0;

  const handleConfirm = () => {
    const data = {
      name,
      instruction,
      hint,
      flagPart: flagPart || name.toUpperCase().replace(/\s+/g, '_'),
      customToolId: '',
      pinConditions: [],
      pinLogic: 'AND' as const,
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

  const popupWidth = 340;
  const popupMaxHeight = Math.min(420, containerDims.height - 16);
  const posX = Math.max(8, Math.min((containerDims.width - popupWidth) / 2, containerDims.width - popupWidth - 8));
  const posY = Math.max(8, Math.min(containerDims.height / 2 - 210, containerDims.height - popupMaxHeight - 8));

  return (
    <div
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 text-white shadow-2xl ring-1 ring-white/10 z-40 pointer-events-auto overflow-y-auto"
      style={{ left: posX, top: posY, width: popupWidth, maxHeight: popupMaxHeight }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <HardDrive className="h-4 w-4 text-orange-400 flex-shrink-0" />
        <span className="text-sm font-medium text-orange-300">Firmware Dump Objective</span>
      </div>

      {/* Config status */}
      <div className="mb-3">
        {hasConfig ? (
          <div className="text-xs bg-gray-700/50 rounded p-2 space-y-1">
            <div className="text-gray-400">SPI Flash Reader configured:</div>
            <div className="text-gray-300">{fwConfig!.probes.length} probes, {fwConfig!.requiredConnections.length} required connections</div>
            {fwConfig!.fileName && <div className="text-gray-300 font-mono">{fwConfig!.fileName}</div>}
          </div>
        ) : (
          <div className="text-xs bg-orange-900/30 rounded p-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
            <span className="text-orange-300">Configure the SPI Flash Reader in the Tool Config tab first</span>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Title</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Objective name..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          autoFocus
        />
      </div>

      {/* Instruction */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Instruction</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Instruction for the student..."
          rows={3}
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
        />
      </div>

      {/* Hint */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Hint</label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Hint for the student..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Flag part */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Flag part</label>
        <input
          type="text"
          value={flagPart}
          onChange={(e) => setFlagPart(e.target.value)}
          placeholder={name.toUpperCase().replace(/\s+/g, '_') || 'DUMP_OK'}
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancelObjectiveEdit} className="text-gray-400 hover:text-white">
          Cancel
        </Button>
        <Button size="sm" onClick={handleConfirm} className="bg-orange-700 hover:bg-orange-600">
          Confirm
        </Button>
      </div>
    </div>
  );
};

export default FirmwareDumpObjectivePopup;
