// src/store/presetStore.ts
'use client';

import { create } from 'zustand';
import type { Preset, PresetListItem } from '@/types/preset';
import type { Exercise } from '@/data/exercise';
import { SETTINGS_STORAGE_KEY } from '@/data/exercise';
import { useSettingsStore } from '@/store/settingsStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';

const ACTIVE_PRESET_STORAGE_KEY = 'pcb-ctf-active-preset';

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface PresetState {
  presets: PresetListItem[];
  activePresetId: string | null;
  isLoading: boolean;
  isDirty: boolean;

  fetchPresets: () => Promise<void>;
  loadPreset: (id: string) => Promise<ActionResult>;
  saveAsNewPreset: (name: string, description?: string) => Promise<ActionResult>;
  updatePreset: (id: string) => Promise<ActionResult>;
  deletePreset: (id: string) => Promise<ActionResult>;
  renamePreset: (id: string, name: string) => Promise<ActionResult>;
  setDirty: (dirty: boolean) => void;
  clearActivePreset: () => void;
}

/** Capture the current config snapshot from both stores. */
function captureCurrentConfig(): { exerciseConfig: Exercise; terminalConfig: any } {
  const exerciseJson = useSettingsStore.getState().exportAsJson();
  const exerciseConfig: Exercise = JSON.parse(exerciseJson);
  const terminalConfig = useTerminalSettingsStore.getState().exportAllTerminalConfigs();
  return { exerciseConfig, terminalConfig };
}

/**
 * Content fields that, when changed, mean the user has modified the configuration.
 * UI-only fields (activeComponentId, canvasZoom, dragState, etc.) are intentionally excluded.
 */
const SETTINGS_CONTENT_FIELDS = [
  'components', 'steps', 'pins', 'pcbImagePath', 'customTools', 'firmwarePath', 'toolGroups', 'toolConfig', 'completionDialog', 'completionDialogEnabled',
] as const;

const TERMINAL_CONTENT_FIELDS = [
  'terminalComponents', 'tabs', 'commands', 'bootStages', 'filesystemEntries', 'flagParts',
] as const;

export const usePresetStore = create<PresetState>((set, get) => {
  // Auto-track dirty state by subscribing to content changes in both stores.
  // Uses reference comparison (O(1) per field) — Zustand guarantees new references on mutation.
  // Guards: skip when loading (prevents the load itself from triggering dirty)
  //         and when no preset is active (dirty tracking only relevant with an active preset).

  useSettingsStore.subscribe((state, prevState) => {
    const s = get();
    if (s.isLoading || !s.activePresetId || s.isDirty) return;
    const changed = SETTINGS_CONTENT_FIELDS.some(
      f => (state as any)[f] !== (prevState as any)[f],
    );
    if (changed) set({ isDirty: true });
  });

  useTerminalSettingsStore.subscribe((state, prevState) => {
    const s = get();
    if (s.isLoading || !s.activePresetId || s.isDirty) return;
    const changed = TERMINAL_CONTENT_FIELDS.some(
      f => (state as any)[f] !== (prevState as any)[f],
    );
    if (changed) set({ isDirty: true });
  });

  return {
    presets: [],
    activePresetId: null,
    isLoading: false,
    isDirty: false,

    fetchPresets: async () => {
      try {
        set({ isLoading: true });
        const res = await fetch('/api/presets');
        const result = await res.json();
        if (result.success) {
          const presets: PresetListItem[] = result.data;
          // Restore activePresetId from localStorage if the preset still exists.
          // This keeps the dropdown consistent after a page reload.
          const storedId = localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY);
          const stillExists = storedId && presets.some(p => p.id === storedId);
          set({
            presets,
            ...(stillExists ? { activePresetId: storedId, isDirty: false } : {}),
          });
        }
      } catch {
        /* ignore */
      } finally {
        set({ isLoading: false });
      }
    },

    loadPreset: async (id) => {
      try {
        set({ isLoading: true });
        const res = await fetch(`/api/presets/${id}`);
        const result = await res.json();

        if (!result.success) {
          return { success: false, error: result.error };
        }

        const preset: Preset = result.data;

        // isLoading=true guards the subscriptions above so the load itself doesn't
        // trigger dirty tracking.
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preset.exerciseConfig));
        useSettingsStore.getState().loadFromStorage();
        // Handle both old single-config and new bundle format
        const tc = preset.terminalConfig;
        const tStore = useTerminalSettingsStore.getState();
        if (Array.isArray(tc)) {
          // New bundle format: [{id, name, config}]
          tStore.resetAll();
          for (const entry of tc) {
            tStore.loadFromTerminalConfig(entry.config, entry.id);
          }
        } else {
          tStore.loadFromTerminalConfig(tc);
        }
        // Sync terminal config to localStorage so the simulator can read it
        tStore.applyTerminalConfig();

        localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, id);
        set({ activePresetId: id, isDirty: false });
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        set({ isLoading: false });
      }
    },

    saveAsNewPreset: async (name, description = '') => {
      try {
        set({ isLoading: true });
        const { exerciseConfig, terminalConfig } = captureCurrentConfig();

        const preset: Preset = {
          metadata: {
            id: '', // server will generate
            name,
            description,
            createdAt: '',
            updatedAt: '',
          },
          exerciseConfig,
          terminalConfig,
        };

        const res = await fetch('/api/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preset),
        });
        const result = await res.json();

        if (result.success) {
          // If the server copied the image to a preset-owned path, sync the store
          // so subsequent operations (exportAsJson, uploadImage cleanup) use the right path.
          if (result.pcbImage) {
            useSettingsStore.getState().setPcbImagePath(result.pcbImage);
          }
          await get().fetchPresets();
          localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, result.id);
          set({ activePresetId: result.id, isDirty: false });
          return { success: true, id: result.id };
        }

        return { success: false, error: result.error };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        set({ isLoading: false });
      }
    },

    updatePreset: async (id) => {
      try {
        set({ isLoading: true });
        const { exerciseConfig, terminalConfig } = captureCurrentConfig();

        const existing = get().presets.find(p => p.id === id);
        if (!existing) {
          return { success: false, error: 'Preset not found' };
        }

        const preset: Preset = {
          metadata: {
            id,
            name: existing.name,
            description: existing.description,
            createdAt: existing.createdAt,
            updatedAt: '',
          },
          exerciseConfig,
          terminalConfig,
        };

        const res = await fetch(`/api/presets/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preset),
        });
        const result = await res.json();

        if (result.success) {
          // If the server copied a new image to the preset-owned path, sync the store.
          if (result.pcbImage) {
            useSettingsStore.getState().setPcbImagePath(result.pcbImage);
          }
          await get().fetchPresets();
          set({ isDirty: false });
          return { success: true };
        }

        return { success: false, error: result.error };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        set({ isLoading: false });
      }
    },

    deletePreset: async (id) => {
      try {
        set({ isLoading: true });
        const res = await fetch(`/api/presets/${id}`, { method: 'DELETE' });
        const result = await res.json();

        if (result.success) {
          const { activePresetId } = get();
          if (activePresetId === id) {
            localStorage.removeItem(ACTIVE_PRESET_STORAGE_KEY);
            set({ activePresetId: null });
          }
          await get().fetchPresets();
          return { success: true };
        }

        return { success: false, error: result.error };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        set({ isLoading: false });
      }
    },

    renamePreset: async (id, name) => {
      try {
        set({ isLoading: true });

        const loadRes = await fetch(`/api/presets/${id}`);
        const loadResult = await loadRes.json();
        if (!loadResult.success) {
          return { success: false, error: loadResult.error };
        }

        const preset: Preset = loadResult.data;
        preset.metadata.name = name;

        const res = await fetch(`/api/presets/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preset),
        });
        const result = await res.json();

        if (result.success) {
          await get().fetchPresets();
          return { success: true };
        }

        return { success: false, error: result.error };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        set({ isLoading: false });
      }
    },

    setDirty: (dirty) => set({ isDirty: dirty }),
    clearActivePreset: () => {
      localStorage.removeItem(ACTIVE_PRESET_STORAGE_KEY);
      set({ activePresetId: null, isDirty: false });
    },
  };
});
