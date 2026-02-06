// src/app/settings/page.tsx
'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import SettingsSidebar from '@/components/features/settings/SettingsSidebar';
import SettingsCanvas from '@/components/features/settings/SettingsCanvas';

export default function SettingsPage() {
  const loadFromStorage = useSettingsStore(s => s.loadFromStorage);
  const hasItems = useSettingsStore(s => s.components.length > 0 || s.pins.length > 0);

  // Carica la configurazione salvata al primo accesso (solo se lo store è vuoto)
  useEffect(() => {
    if (!hasItems) loadFromStorage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-4">
            <SettingsCanvas />
          </div>
        </div>
      </div>
    </main>
  );
}
