// src/hooks/useTerminalConfig.ts
'use client';

import { useState, useEffect } from 'react';
import type { TerminalConfig } from '@/types/terminal-config';
import staticTerminalConfig from '@/config/terminal.config';
import { TERMINAL_STORAGE_KEY } from '@/store/terminalSettingsStore';

/** Bundle entry stored by the settings panel. */
interface TerminalComponentEntry {
  id: string;
  name: string;
  config: TerminalConfig;
}

/**
 * Parse the stored value which can be:
 * - Old format: a single TerminalConfig object
 * - New bundle format: an array of {id, name, config} entries
 *
 * Returns the full map of configs keyed by component ID,
 * plus a "default" config (first entry or the single config).
 */
function parseStoredConfig(raw: string): { configs: Map<string, TerminalConfig>; defaultConfig: TerminalConfig } | null {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // New bundle format
      const configs = new Map<string, TerminalConfig>();
      for (const entry of parsed as TerminalComponentEntry[]) {
        if (entry.config?.tabs?.length > 0) {
          configs.set(entry.id, entry.config);
        }
      }
      if (configs.size === 0) return null;
      const defaultConfig = configs.values().next().value!;
      return { configs, defaultConfig };
    } else if (parsed?.tabs?.length > 0) {
      // Old single-config format
      const configs = new Map<string, TerminalConfig>();
      configs.set('default', parsed);
      return { configs, defaultConfig: parsed };
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Hook to load terminal configuration dynamically.
 * Reads from localStorage first, falls back to static config.
 *
 * @param terminalComponentId Optional component ID to load a specific terminal component.
 *   If not provided, returns the first (or only) config.
 */
export function useTerminalConfig(terminalComponentId?: string): { config: TerminalConfig; isCustom: boolean } {
  const [config, setConfig] = useState<TerminalConfig>(staticTerminalConfig);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TERMINAL_STORAGE_KEY);
    if (saved) {
      const result = parseStoredConfig(saved);
      if (result) {
        const chosen = (terminalComponentId && result.configs.get(terminalComponentId)) || result.defaultConfig;
        setConfig(chosen);
        setIsCustom(true);
      }
    }
  }, [terminalComponentId]);

  // Listen for storage changes (cross-tab via StorageEvent, same-tab via custom event)
  useEffect(() => {
    function reloadFromStorage() {
      const saved = localStorage.getItem(TERMINAL_STORAGE_KEY);
      if (saved) {
        const result = parseStoredConfig(saved);
        if (result) {
          const chosen = (terminalComponentId && result.configs.get(terminalComponentId)) || result.defaultConfig;
          setConfig(chosen);
          setIsCustom(true);
          return;
        }
      }
      setConfig(staticTerminalConfig);
      setIsCustom(false);
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
  }, [terminalComponentId]);

  return { config, isCustom };
}
