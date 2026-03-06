// src/app/settings/page.tsx
'use client';

import { useEffect } from 'react';
import { notFound } from 'next/navigation';
import { isDev } from '@/config/env';
import { useSettingsStore } from '@/store/settingsStore';
import { usePresetStore } from '@/store/presetStore';
import SettingsSidebar from '@/components/features/settings/SettingsSidebar';
import SettingsCanvas from '@/components/features/settings/SettingsCanvas';
import CanvasToolbar from '@/components/features/settings/CanvasToolbar';

export default function SettingsPage() {
  // In PROD questa rotta non esiste (404)
  if (!isDev) {
    notFound();
  }
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
      <div className="grid w-full max-w-7xl gap-x-8 gap-y-2" style={{ gridTemplateColumns: 'auto 1fr' }}>
        {/* Row 1, Col 2: toolbar allineata al canvas */}
        {(activeTool === 'component' || activeTool === 'pin') && (
          <div className="col-start-2 row-start-1">
            <CanvasToolbar />
          </div>
        )}

        {/* Row 2, Col 1: sidebar centrata rispetto al canvas */}
        <div className="col-start-1 row-start-2 self-center flex-shrink-0">
          <SettingsSidebar />
        </div>

        {/* Row 2, Col 2: canvas */}
        <div className="col-start-2 row-start-2 border-2 border-dashed border-gray-500 rounded-lg p-4 overflow-hidden">
          <SettingsCanvas />
        </div>
      </div>

    </main>
  );
}
