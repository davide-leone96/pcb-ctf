// src/components/features/settings/TerminalObjectivePopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftObjective } from '@/store/settingsStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import { Button } from '@/components/ui/button';
import { TerminalSquare, Cable, Lock, Package } from 'lucide-react';
import HintFilesUpload from './HintFilesUpload';

interface TerminalObjectivePopupProps {
  objective: DraftObjective;
  containerDims: { width: number; height: number };
}

const TerminalObjectivePopup = ({ objective, containerDims }: TerminalObjectivePopupProps) => {
  const { saveObjective, updateObjective, cancelObjectiveEdit } = useSettingsStore();
  const { terminalComponents } = useTerminalSettingsStore();

  const isNew = objective.instruction === '' && objective.hint === '' && objective.flagPart === '';

  const [name, setName] = useState(objective.name);
  const [instruction, setInstruction] = useState(objective.instruction);
  const [hint, setHint] = useState(objective.hint);
  const [requiresUart, setRequiresUart] = useState(objective.requiresUart);
  const [terminalPersistent, setTerminalPersistent] = useState(objective.terminalPersistent);
  const [terminalComponentId, setTerminalComponentId] = useState(objective.terminalComponentId || '');
  const [hintFiles, setHintFiles] = useState<string[]>(objective.hintFiles || []);

  useEffect(() => {
    setName(objective.name);
    setInstruction(objective.instruction);
    setHint(objective.hint);
    setRequiresUart(objective.requiresUart);
    setTerminalPersistent(objective.terminalPersistent);
    setTerminalComponentId(objective.terminalComponentId || '');
    setHintFiles(objective.hintFiles || []);
  }, [objective]);

  const handleConfirm = () => {
    const data = {
      name,
      pinConditions: [],
      pinLogic: 'AND' as const,
      instruction,
      hint,
      hintFiles,
      flagPart: 'TERMINAL',
      customToolId: '',
      terminalComponentId,
      bootStageConditions: [],
      requiresUart,
      terminalPersistent,
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
        <span className="text-sm font-medium text-green-300">Terminal Objective</span>
      </div>

      {/* Terminal component selector */}
      {terminalComponents.length > 0 && (
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Package className="h-3 w-3" />
            Componente terminale
          </label>
          <select
            value={terminalComponentId}
            onChange={(e) => setTerminalComponentId(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
          >
            <option value="">-- Nessuno --</option>
            {terminalComponents.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Title</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Objective name..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
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
          placeholder="General hint..."
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
        />
      </div>

      {/* Hint Files */}
      <div className="mb-3">
        <HintFilesUpload files={hintFiles} onChange={setHintFiles} />
      </div>

      {/* Requires UART */}
      <div className="mb-3">
        <label
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setRequiresUart(!requiresUart)}
        >
          <div className={`w-8 h-4 rounded-full transition-colors relative ${requiresUart ? 'bg-green-600' : 'bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${requiresUart ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <Cable className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-300">Requires UART connection</span>
        </label>
      </div>

      {/* Terminal Persistent */}
      <div className="mb-3">
        <label
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setTerminalPersistent(!terminalPersistent)}
        >
          <div className={`w-8 h-4 rounded-full transition-colors relative ${terminalPersistent ? 'bg-green-600' : 'bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${terminalPersistent ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <Lock className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-300">Cannot be disabled from toolbar</span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancelObjectiveEdit} className="text-gray-400 hover:text-white">
          Cancel
        </Button>
        <Button size="sm" onClick={handleConfirm} className="bg-green-700 hover:bg-green-600">
          Confirm
        </Button>
      </div>
    </div>
  );
};

export default TerminalObjectivePopup;
