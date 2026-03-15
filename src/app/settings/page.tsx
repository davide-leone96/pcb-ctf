// src/app/settings/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { notFound } from 'next/navigation';
import { isDev } from '@/config/env';
import { useSettingsStore } from '@/store/settingsStore';
import { usePresetStore } from '@/store/presetStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import SettingsSidebar from '@/components/features/settings/SettingsSidebar';
import SettingsCanvas from '@/components/features/settings/SettingsCanvas';
import CanvasToolbar from '@/components/features/settings/CanvasToolbar';

export default function SettingsPage() {
  // In PROD this route does not exist (404)
  if (!isDev) {
    notFound();
  }
  const loadFromStorage = useSettingsStore(s => s.loadFromStorage);
  const activeTool = useSettingsStore(s => s.activeTool);
  const fetchPresets = usePresetStore(s => s.fetchPresets);
  const loadPreset = usePresetStore(s => s.loadPreset);
  const terminalInitialized = useTerminalSettingsStore(s => s.initialized);
  const terminalComponentsCount = useTerminalSettingsStore(s => s.terminalComponents.length);
  const autoLoadAttempted = useRef(false);

  // Always load saved configuration on startup + preset list
  useEffect(() => {
    loadFromStorage();
    fetchPresets();
  }, [loadFromStorage, fetchPresets]);

  // Auto-load active preset's terminal config when terminal store is empty
  useEffect(() => {
    if (autoLoadAttempted.current) return;
    if (!terminalInitialized || terminalComponentsCount === 0) {
      const activeId = usePresetStore.getState().activePresetId
        || localStorage.getItem('pcb-ctf-active-preset');
      if (activeId) {
        autoLoadAttempted.current = true;
        loadPreset(activeId);
      }
    }
  }, [terminalInitialized, terminalComponentsCount, loadPreset]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 p-6 lg:p-12">
      <h1 className="mb-8 text-3xl font-bold text-white">
        ARTIC - Exercise Configuration
      </h1>
      <div className="grid w-full max-w-7xl gap-x-8 gap-y-2" style={{ gridTemplateColumns: 'auto 1fr' }}>
        {/* Row 1, Col 2: toolbar aligned with canvas */}
        {(activeTool === 'component' || activeTool === 'pin') && (
          <div className="col-start-2 row-start-1">
            <CanvasToolbar />
          </div>
        )}

        {/* Row 2, Col 1: sidebar centered relative to canvas */}
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
