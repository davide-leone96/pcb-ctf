// src/hooks/useTerminalConfig.ts
'use client';

import { useState, useEffect } from 'react';
import type { TerminalConfig } from '@/types/terminal-config';
import staticTerminalConfig from '@/config/terminal.config';
import { TERMINAL_STORAGE_KEY } from '@/store/terminalSettingsStore';

/**
 * Hook to load terminal configuration dynamically.
 * Reads from localStorage first, falls back to static config.
 */
export function useTerminalConfig(): { config: TerminalConfig; isCustom: boolean } {
  const [config, setConfig] = useState<TerminalConfig>(staticTerminalConfig);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TERMINAL_STORAGE_KEY);
      if (saved) {
        const parsed: TerminalConfig = JSON.parse(saved);
        // Basic validation
        if (parsed.tabs && parsed.tabs.length > 0) {
          setConfig(parsed);
          setIsCustom(true);
        }
      }
    } catch {
      // Use static config on error
    }
  }, []);

  // Listen for storage changes (cross-tab via StorageEvent, same-tab via custom event)
  useEffect(() => {
    function reloadFromStorage() {
      try {
        const saved = localStorage.getItem(TERMINAL_STORAGE_KEY);
        if (saved) {
          const parsed: TerminalConfig = JSON.parse(saved);
          if (parsed.tabs && parsed.tabs.length > 0) {
            setConfig(parsed);
            setIsCustom(true);
            return;
          }
        }
        setConfig(staticTerminalConfig);
        setIsCustom(false);
      } catch {
        setConfig(staticTerminalConfig);
        setIsCustom(false);
      }
    }

    function handleStorageChange(e: StorageEvent) {
      if (e.key === TERMINAL_STORAGE_KEY) {
        reloadFromStorage();
      }
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('terminal-config-updated', reloadFromStorage);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('terminal-config-updated', reloadFromStorage);
    };
  }, []);

  return { config, isCustom };
}
