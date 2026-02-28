// src/app/settings/page.tsx
'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { usePresetStore } from '@/store/presetStore';
import SettingsSidebar from '@/components/features/settings/SettingsSidebar';
import SettingsCanvas from '@/components/features/settings/SettingsCanvas';
import CanvasToolbar from '@/components/features/settings/CanvasToolbar';

export default function SettingsPage() {
  const loadFromStorage = useSettingsStore(s => s.loadFromStorage);
  const activeTool = useSettingsStore(s => s.activeTool);
  const fetchPresets = usePresetStore(s => s.fetchPresets);
  // Carica sempre la configurazione salvata all'avvio + lista preset
  useEffect(() => {
    loadFromStorage();
    fetchPresets();
  }, [loadFromStorage, fetchPresets]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-6 lg:p-12">
      <h1 className="mb-8 text-3xl font-bold text-white">
        ARTIC - Configurazione Esercizio
      </h1>
      <div className="flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
        <div className="flex-shrink-0">
          <SettingsSidebar />
        </div>
        <div className="flex-grow">
          {activeTool !== 'terminal-config' && <CanvasToolbar />}
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-4 overflow-hidden">
            <SettingsCanvas />
          </div>
        </div>
      </div>

    </main>
  );
}
