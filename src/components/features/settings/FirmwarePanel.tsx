// src/components/features/settings/FirmwarePanel.tsx
'use client';

import { useSettingsStore } from '@/store/settingsStore';
import { FileCheck, HardDrive } from 'lucide-react';

const FirmwarePanel = () => {
  const { firmwarePath, firmwareFileName } = useSettingsStore();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Firmware</h3>

      {firmwarePath ? (
        <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-3">
          <FileCheck className="h-4 w-4 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{firmwareFileName || firmwarePath}</p>
            <p className="text-xs text-gray-400 truncate">{firmwarePath}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-gray-700/30 rounded-lg p-3">
          <HardDrive className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <p className="text-sm text-gray-500">Trascina un file nel pannello principale per caricarlo</p>
        </div>
      )}
    </div>
  );
};

export default FirmwarePanel;
