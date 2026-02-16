// src/store/terminalSettingsStore.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TerminalConfig,
  TabConfig,
  CommandDefinition,
  FlagPart,
  BootStage,
  CommandOutput,
  CommandSideEffects,
  CommandConstraints,
  FlagUnlock,
  ConditionCheck,
  FilesystemStructure,
  FilesystemTree,
} from '@/types/terminal-config';

// ============================================
// CONSTANTS
// ============================================

export const TERMINAL_STORAGE_KEY = 'pcb-ctf-terminal-config';
const TERMINAL_DRAFT_STORAGE_KEY = 'pcb-ctf-terminal-settings-draft';

// ============================================
// ID GENERATOR
// ============================================

const generateId = (prefix: string): string => {
  const hash = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  return `${prefix}-${hash}`;
};

// ============================================
// TREE HELPERS
// ============================================

/** Build a nested FilesystemTree from flat DraftFilesystemEntry array. */
function buildTree(entries: DraftFilesystemEntry[]): FilesystemTree {
  const tree: FilesystemTree = {};

  // Sort by depth so parents exist before children
  const sorted = [...entries].sort((a, b) => {
    const dA = a.path.split('/').filter(Boolean).length;
    const dB = b.path.split('/').filter(Boolean).length;
    return dA - dB;
  });

  for (const entry of sorted) {
    if (entry.path === '/') continue; // root = tree itself

    const parts = entry.path.split('/').filter(Boolean);
    let current: FilesystemTree = tree;

    // Navigate/create intermediate dirs
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as FilesystemTree;
    }

    const name = parts[parts.length - 1];
    if (entry.type === 'directory') {
      if (!current[name] || typeof current[name] === 'string') {
        current[name] = {};
      }
    } else {
      current[name] = entry.content || '';
    }
  }

  return tree;
}

/** Flatten a FilesystemTree into DraftFilesystemEntry array (for store import). */
function flattenTreeToEntries(
  tree: FilesystemTree,
  tabId: string,
  basePath: string = '/'
): DraftFilesystemEntry[] {
  const entries: DraftFilesystemEntry[] = [];

  // Add current directory (except root which is added by caller)
  if (basePath !== '/') {
    entries.push({
      id: generateId('fs'),
      tabId,
      path: basePath,
      type: 'directory',
      content: '',
    });
  }

  for (const [name, value] of Object.entries(tree)) {
    if (!name || name.includes('/')) continue;
    const fullPath = basePath === '/' ? `/${name}` : `${basePath}/${name}`;

    if (typeof value === 'string') {
      entries.push({
        id: generateId('fs'),
        tabId,
        path: fullPath,
        type: 'file',
        content: value,
      });
    } else if (value && typeof value === 'object') {
      entries.push(...flattenTreeToEntries(value, tabId, fullPath));
    }
  }

  return entries;
}

// ============================================
// DRAFT TYPES
// ============================================

export interface DraftTab {
  id: string;
  name: string;
  initialPath: string;
  environment: Record<string, string>;
  defaultBootStage: string; // default bootStage constraint for commands in this tab
}

export interface DraftCommand {
  id: string;
  tabId: string;
  name: string;
  description: string;
  aliases: string[];
  handler: 'builtin' | 'custom';
  builtinType: string;
  // Constraints (simplified)
  bootStages: string[];
  minArgs: number;
  maxArgs: number;
  // Output
  outputType: 'none' | 'static' | 'conditional' | 'lookup';
  staticLines: string[];
  conditionalRules: DraftConditionalRule[];
  defaultOutputLines: string[];
  // Lookup output
  lookupMatchType: 'equals' | 'contains' | 'regex';
  lookupArgIndex: number;
  lookupEntries: DraftLookupEntry[];
  // Side effects
  flagUnlocks: DraftFlagUnlock[];
  stateChanges: Record<string, string>;
}

export interface DraftLookupEntry {
  id: string;
  matchValue: string;
  outputLines: string[];
}

export interface DraftConditionalRule {
  id: string;
  argIndex: number;
  matchType: 'equals' | 'contains' | 'regex';
  matchValue: string;
  outputLines: string[];
  flagUnlockId: string;
}

export interface DraftFlagUnlock {
  id: string;
  flagId: string;
  conditional: boolean;
  argIndex: number;
  matchType: 'equals' | 'contains' | 'regex';
  matchValue: string;
}

export interface DraftFlagPart {
  id: string;
  part: string;
  description: string;
  hint: string;
}

export interface DraftBootStage {
  id: string;
  tabId: string;
  name: string;
  lines: string[];
  duration: number;
  nextStage: string;
  prompt: string;
}

export interface DraftFilesystemEntry {
  id: string;
  tabId: string;
  path: string;
  type: 'file' | 'directory';
  content: string; // for files: file content
}

export type TerminalSection = 'commands' | 'flags' | 'boot' | 'filesystem' | 'tabs';

// ============================================
// STORE INTERFACE
// ============================================

interface TerminalSettingsState {
  // Data
  tabs: DraftTab[];
  commands: DraftCommand[];
  bootStages: DraftBootStage[];
  filesystemEntries: DraftFilesystemEntry[];
  flagParts: DraftFlagPart[];
  completeFlag: string;
  configName: string;
  configDescription: string;

  // UI state
  activeSection: TerminalSection;
  activeTabId: string;
  activeCommandId: string | null;
  editingCommandId: string | null;
  activeFlagPartId: string | null;
  activeBootStageId: string | null;
  activeFilesystemEntryId: string | null;
  initialized: boolean;

  // Tab CRUD
  addTab: () => void;
  updateTab: (id: string, data: Partial<DraftTab>) => void;
  deleteTab: (id: string) => void;

  // Command CRUD
  addCommand: (tabId: string) => string;
  updateCommand: (id: string, data: Partial<DraftCommand>) => void;
  deleteCommand: (id: string) => void;
  duplicateCommand: (id: string) => void;

  // Flag CRUD
  addFlagPart: () => void;
  updateFlagPart: (id: string, data: Partial<DraftFlagPart>) => void;
  deleteFlagPart: (id: string) => void;
  updateCompleteFlag: (flag: string) => void;

  // Boot stage CRUD
  addBootStage: (tabId: string) => void;
  updateBootStage: (id: string, data: Partial<DraftBootStage>) => void;
  deleteBootStage: (id: string) => void;
  reorderBootStage: (id: string, direction: 'up' | 'down') => void;

  // Filesystem CRUD
  addFilesystemEntry: (tabId: string, type: 'file' | 'directory') => void;
  updateFilesystemEntry: (id: string, data: Partial<DraftFilesystemEntry>) => void;
  deleteFilesystemEntry: (id: string) => void;

  // UI actions
  setActiveSection: (section: TerminalSection) => void;
  setActiveTabId: (tabId: string) => void;
  setActiveCommandId: (id: string | null) => void;
  setEditingCommandId: (id: string | null) => void;

  // Export / Import
  exportAsTerminalConfig: () => TerminalConfig;
  loadFromTerminalConfig: (config: TerminalConfig) => void;
  applyTerminalConfig: () => void;
  loadFromStorage: () => void;

  // Persistence
  saveToFile: () => Promise<{ success: boolean; error?: string; message?: string }>;
  loadFromFile: () => Promise<{ success: boolean; error?: string; message?: string }>;
  resetAll: () => void;
}

// ============================================
// HELPERS
// ============================================

function commandDefToDraft(name: string, cmd: CommandDefinition, tabId: string): DraftCommand {
  const bootStages: string[] = [];
  if (cmd.constraints?.state?.bootStage) {
    const bs = cmd.constraints.state.bootStage;
    if (Array.isArray(bs)) bootStages.push(...bs);
    else bootStages.push(bs);
  }

  const flagUnlocks: DraftFlagUnlock[] = [];
  if (cmd.sideEffects?.unlockFlags) {
    for (const fu of cmd.sideEffects.unlockFlags) {
      if (typeof fu === 'string') {
        flagUnlocks.push({
          id: generateId('fu'),
          flagId: fu,
          conditional: false,
          argIndex: 0,
          matchType: 'equals',
          matchValue: '',
        });
      } else {
        flagUnlocks.push({
          id: generateId('fu'),
          flagId: fu.id,
          conditional: !!fu.condition,
          argIndex: fu.condition?.index || 0,
          matchType: (fu.condition?.equals ? 'equals' : fu.condition?.contains ? 'contains' : fu.condition?.regex ? 'regex' : 'equals') as any,
          matchValue: fu.condition?.equals || fu.condition?.contains || fu.condition?.regex || '',
        });
      }
    }
  }

  let outputType: 'none' | 'static' | 'conditional' | 'lookup' = 'none';
  let staticLines: string[] = [];
  let conditionalRules: DraftConditionalRule[] = [];
  let defaultOutputLines: string[] = [];
  let lookupMatchType: 'equals' | 'contains' | 'regex' = 'contains';
  let lookupArgIndex = 0;
  let lookupEntries: DraftLookupEntry[] = [];

  if (cmd.output) {
    if (cmd.output.type === 'static') {
      outputType = 'static';
      staticLines = cmd.output.lines;
    } else if (cmd.output.type === 'conditional') {
      outputType = 'conditional';
      for (const cond of cmd.output.conditions) {
        conditionalRules.push({
          id: generateId('cr'),
          argIndex: cond.if.index || 0,
          matchType: (cond.if.equals ? 'equals' : cond.if.contains ? 'contains' : 'regex') as any,
          matchValue: cond.if.equals || cond.if.contains || cond.if.regex || '',
          outputLines: cond.then.type === 'static' ? cond.then.lines : [],
          flagUnlockId: '',
        });
      }
      if (cmd.output.default && cmd.output.default.type === 'static') {
        defaultOutputLines = cmd.output.default.lines;
      }
    } else if (cmd.output.type === 'lookup') {
      outputType = 'lookup';
      lookupMatchType = cmd.output.matchType;
      lookupArgIndex = cmd.output.argIndex;
      lookupEntries = Object.entries(cmd.output.table).map(([key, lines]) => ({
        id: generateId('lu'),
        matchValue: key,
        outputLines: lines,
      }));
      if (cmd.output.default && cmd.output.default.type === 'static') {
        defaultOutputLines = cmd.output.default.lines;
      }
    }
  }

  const stateChanges: Record<string, string> = {};
  if (cmd.sideEffects?.setState) {
    for (const [k, v] of Object.entries(cmd.sideEffects.setState)) {
      stateChanges[k] = String(v);
    }
  }

  return {
    id: generateId('cmd'),
    tabId,
    name,
    description: cmd.description || '',
    aliases: cmd.aliases || [],
    handler: cmd.handler === 'builtin' ? 'builtin' : 'custom',
    builtinType: cmd.builtinType || '',
    bootStages,
    minArgs: cmd.constraints?.arguments?.min ?? 0,
    maxArgs: cmd.constraints?.arguments?.max ?? -1,
    outputType,
    staticLines,
    conditionalRules,
    defaultOutputLines,
    lookupMatchType,
    lookupArgIndex,
    lookupEntries,
    flagUnlocks,
    stateChanges,
  };
}

function draftToCommandDef(draft: DraftCommand): CommandDefinition {
  const constraints: CommandConstraints = {};

  if (draft.bootStages.length > 0) {
    constraints.state = {
      bootStage: draft.bootStages.length === 1 ? draft.bootStages[0] : draft.bootStages,
    };
  }
  if (draft.minArgs > 0 || draft.maxArgs >= 0) {
    constraints.arguments = {};
    if (draft.minArgs > 0) constraints.arguments.min = draft.minArgs;
    if (draft.maxArgs >= 0) constraints.arguments.max = draft.maxArgs;
  }

  let output: CommandOutput | undefined;
  if (draft.outputType === 'static' && draft.staticLines.length > 0) {
    output = { type: 'static', lines: draft.staticLines };
  } else if (draft.outputType === 'conditional' && draft.conditionalRules.length > 0) {
    output = {
      type: 'conditional',
      conditions: draft.conditionalRules.map(rule => ({
        if: {
          type: 'argument' as const,
          index: rule.argIndex,
          ...(rule.matchType === 'equals' ? { equals: rule.matchValue } :
            rule.matchType === 'contains' ? { contains: rule.matchValue } :
              { regex: rule.matchValue }),
        },
        then: { type: 'static' as const, lines: rule.outputLines },
      })),
      ...(draft.defaultOutputLines.length > 0 ? {
        default: { type: 'static' as const, lines: draft.defaultOutputLines },
      } : {}),
    };
  } else if (draft.outputType === 'lookup' && (draft.lookupEntries || []).length > 0) {
    const table: Record<string, string[]> = {};
    for (const entry of draft.lookupEntries) {
      table[entry.matchValue] = entry.outputLines;
    }
    output = {
      type: 'lookup',
      argIndex: draft.lookupArgIndex || 0,
      matchType: draft.lookupMatchType || 'contains',
      table,
      ...(draft.defaultOutputLines.length > 0 ? {
        default: { type: 'static' as const, lines: draft.defaultOutputLines },
      } : {}),
    };
  }

  const sideEffects: CommandSideEffects = {};
  if (draft.flagUnlocks.length > 0) {
    sideEffects.unlockFlags = draft.flagUnlocks.map(fu => {
      if (!fu.conditional) return fu.flagId;
      return {
        id: fu.flagId,
        condition: {
          type: 'argument' as const,
          index: fu.argIndex,
          ...(fu.matchType === 'equals' ? { equals: fu.matchValue } :
            fu.matchType === 'contains' ? { contains: fu.matchValue } :
              { regex: fu.matchValue }),
        },
      };
    });
  }
  if (Object.keys(draft.stateChanges).length > 0) {
    sideEffects.setState = { ...draft.stateChanges };
  }

  const def: CommandDefinition = {
    name: draft.name,
    description: draft.description,
    handler: draft.handler,
    ...(draft.aliases.length > 0 ? { aliases: draft.aliases } : {}),
    ...(draft.handler === 'builtin' && draft.builtinType ? { builtinType: draft.builtinType } : {}),
    ...(Object.keys(constraints).length > 0 ? { constraints } : {}),
    ...(output ? { output } : {}),
    ...(Object.keys(sideEffects).length > 0 ? { sideEffects } : {}),
  };

  return def;
}

// ============================================
// STORE
// ============================================

export const useTerminalSettingsStore = create<TerminalSettingsState>()(
  persist(
    (set, get) => ({
  // Initial state
  tabs: [],
  commands: [],
  bootStages: [],
  filesystemEntries: [],
  flagParts: [],
  completeFlag: '',
  configName: '',
  configDescription: '',
  activeSection: 'commands',
  activeTabId: '',
  activeCommandId: null,
  editingCommandId: null,
  activeFlagPartId: null,
  activeBootStageId: null,
  activeFilesystemEntryId: null,
  initialized: false,

  // ============================================
  // TAB CRUD
  // ============================================

  addTab: () => {
    const id = generateId('tab');
    const newTab: DraftTab = {
      id,
      name: `Tab ${get().tabs.length + 1}`,
      initialPath: '/',
      environment: { USER: 'root', HOME: '/root', PATH: '/bin:/sbin:/usr/bin:/usr/sbin', SHELL: '/bin/sh' },
      defaultBootStage: '',
    };
    set({ tabs: [...get().tabs, newTab], activeTabId: id });
  },

  updateTab: (id, data) => {
    set({ tabs: get().tabs.map(t => t.id === id ? { ...t, ...data } : t) });
  },

  deleteTab: (id) => {
    const { tabs, commands, bootStages, filesystemEntries, activeTabId } = get();
    set({
      tabs: tabs.filter(t => t.id !== id),
      commands: commands.filter(c => c.tabId !== id),
      bootStages: bootStages.filter(b => b.tabId !== id),
      filesystemEntries: filesystemEntries.filter(f => f.tabId !== id),
      activeTabId: activeTabId === id ? (tabs[0]?.id || '') : activeTabId,
    });
  },

  // ============================================
  // COMMAND CRUD
  // ============================================

  addCommand: (tabId) => {
    const id = generateId('cmd');
    const newCmd: DraftCommand = {
      id,
      tabId,
      name: '',
      description: '',
      aliases: [],
      handler: 'custom',
      builtinType: '',
      bootStages: [],
      minArgs: 0,
      maxArgs: -1,
      outputType: 'static',
      staticLines: [],
      conditionalRules: [],
      defaultOutputLines: [],
      lookupMatchType: 'contains',
      lookupArgIndex: 0,
      lookupEntries: [],
      flagUnlocks: [],
      stateChanges: {},
    };
    set({
      commands: [...get().commands, newCmd],
      editingCommandId: id,
    });
    return id;
  },

  updateCommand: (id, data) => {
    set({ commands: get().commands.map(c => c.id === id ? { ...c, ...data } : c) });
  },

  deleteCommand: (id) => {
    const { commands, activeCommandId, editingCommandId } = get();
    set({
      commands: commands.filter(c => c.id !== id),
      activeCommandId: activeCommandId === id ? null : activeCommandId,
      editingCommandId: editingCommandId === id ? null : editingCommandId,
    });
  },

  duplicateCommand: (id) => {
    const cmd = get().commands.find(c => c.id === id);
    if (!cmd) return;
    const newId = generateId('cmd');
    set({
      commands: [...get().commands, { ...cmd, id: newId, name: `${cmd.name}_copy` }],
      editingCommandId: newId,
    });
  },

  // ============================================
  // FLAG CRUD
  // ============================================

  addFlagPart: () => {
    const id = generateId('flag');
    const newFlag: DraftFlagPart = { id, part: '', description: '', hint: '' };
    set({ flagParts: [...get().flagParts, newFlag], activeFlagPartId: id });
  },

  updateFlagPart: (id, data) => {
    set({ flagParts: get().flagParts.map(f => f.id === id ? { ...f, ...data } : f) });
  },

  deleteFlagPart: (id) => {
    set({
      flagParts: get().flagParts.filter(f => f.id !== id),
      activeFlagPartId: get().activeFlagPartId === id ? null : get().activeFlagPartId,
    });
  },

  updateCompleteFlag: (flag) => set({ completeFlag: flag }),

  // ============================================
  // BOOT STAGE CRUD
  // ============================================

  addBootStage: (tabId) => {
    const id = generateId('boot');
    const newStage: DraftBootStage = {
      id, tabId, name: '', lines: [], duration: 0, nextStage: '', prompt: '',
    };
    set({ bootStages: [...get().bootStages, newStage], activeBootStageId: id });
  },

  updateBootStage: (id, data) => {
    set({ bootStages: get().bootStages.map(b => b.id === id ? { ...b, ...data } : b) });
  },

  deleteBootStage: (id) => {
    set({
      bootStages: get().bootStages.filter(b => b.id !== id),
      activeBootStageId: get().activeBootStageId === id ? null : get().activeBootStageId,
    });
  },

  reorderBootStage: (id, direction) => {
    const { bootStages } = get();
    const stage = bootStages.find(b => b.id === id);
    if (!stage) return;

    const tabStages = bootStages.filter(b => b.tabId === stage.tabId);
    const otherStages = bootStages.filter(b => b.tabId !== stage.tabId);
    const idx = tabStages.findIndex(b => b.id === id);

    if (direction === 'up' && idx > 0) {
      [tabStages[idx - 1], tabStages[idx]] = [tabStages[idx], tabStages[idx - 1]];
    } else if (direction === 'down' && idx < tabStages.length - 1) {
      [tabStages[idx], tabStages[idx + 1]] = [tabStages[idx + 1], tabStages[idx]];
    }

    set({ bootStages: [...otherStages, ...tabStages] });
  },

  // ============================================
  // FILESYSTEM CRUD
  // ============================================

  addFilesystemEntry: (tabId, type) => {
    const id = generateId('fs');
    const newEntry: DraftFilesystemEntry = {
      id, tabId, path: type === 'directory' ? '/new-dir' : '/new-file.txt',
      type, content: '',
    };
    set({ filesystemEntries: [...get().filesystemEntries, newEntry], activeFilesystemEntryId: id });
  },

  updateFilesystemEntry: (id, data) => {
    set({ filesystemEntries: get().filesystemEntries.map(f => f.id === id ? { ...f, ...data } : f) });
  },

  deleteFilesystemEntry: (id) => {
    set({
      filesystemEntries: get().filesystemEntries.filter(f => f.id !== id),
      activeFilesystemEntryId: get().activeFilesystemEntryId === id ? null : get().activeFilesystemEntryId,
    });
  },

  // ============================================
  // UI ACTIONS
  // ============================================

  setActiveSection: (section) => set({ activeSection: section }),
  setActiveTabId: (tabId) => set({ activeTabId: tabId }),
  setActiveCommandId: (id) => set({ activeCommandId: id }),
  setEditingCommandId: (id) => set({ editingCommandId: id }),

  // ============================================
  // EXPORT: Draft State → TerminalConfig
  // ============================================

  exportAsTerminalConfig: (): TerminalConfig => {
    const { tabs, commands, bootStages, filesystemEntries, flagParts, completeFlag, configName, configDescription } = get();

    const tabConfigs: TabConfig[] = tabs.map(tab => {
      // Commands for this tab
      const tabCommands = commands.filter(c => c.tabId === tab.id);
      const commandsRecord: Record<string, CommandDefinition> = {};
      for (const cmd of tabCommands) {
        if (cmd.name) {
          commandsRecord[cmd.name] = draftToCommandDef(cmd);
        }
      }

      // Boot stages for this tab
      const tabBootStages = bootStages.filter(b => b.tabId === tab.id);
      const bootSequence = tabBootStages.length > 0 ? {
        initialStage: tabBootStages[0].id,
        stages: tabBootStages.map(b => ({
          id: b.id,
          name: b.name,
          lines: b.lines,
          ...(b.duration > 0 ? { duration: b.duration } : {}),
          ...(b.nextStage ? { nextStage: b.nextStage } : {}),
          ...(b.prompt ? { prompt: b.prompt } : {}),
        })),
      } : undefined;

      // Filesystem for this tab — export as nested tree
      const tabFs = filesystemEntries.filter(f => f.tabId === tab.id);
      const tree = buildTree(tabFs);

      return {
        id: tab.id,
        name: tab.name,
        initialPath: tab.initialPath,
        filesystem: {
          tree,
          directories: {},
          files: {},
          fileDefaults: {
            permissions: '-rw-r--r--',
            owner: tab.environment.USER || 'root',
          },
        },
        commands: commandsRecord,
        ...(bootSequence ? { bootSequence } : {}),
        environment: tab.environment,
        ...(tab.defaultBootStage ? {
          defaultConstraints: { state: { bootStage: tab.defaultBootStage } },
        } : {}),
      };
    });

    return {
      metadata: {
        version: '1.0.0',
        name: configName || 'Terminal Configuration',
        description: configDescription || '',
      },
      tabs: tabConfigs,
      ...(flagParts.length > 0 ? {
        flags: {
          parts: flagParts.map(f => ({ id: f.id, part: f.part, description: f.description, hint: f.hint })),
          completeFlag,
          showProgress: true,
        },
      } : {}),
    };
  },

  // ============================================
  // IMPORT: TerminalConfig → Draft State
  // ============================================

  loadFromTerminalConfig: (config: TerminalConfig) => {
    const tabs: DraftTab[] = [];
    const commands: DraftCommand[] = [];
    const bootStages: DraftBootStage[] = [];
    const filesystemEntries: DraftFilesystemEntry[] = [];

    for (const tab of config.tabs) {
      // Extract default bootStage from tab defaultConstraints
      const defaultBootStage = (typeof tab.defaultConstraints?.state?.bootStage === 'string')
        ? tab.defaultConstraints.state.bootStage
        : '';

      tabs.push({
        id: tab.id,
        name: tab.name,
        initialPath: tab.initialPath || '/',
        environment: tab.environment || {},
        defaultBootStage,
      });

      // Commands: global commands first, then tab-specific (tab overrides global)
      const allCommands: Record<string, CommandDefinition> = {
        ...(config.globalCommands || {}),
        ...(tab.commands || {}),
      };
      for (const [name, cmd] of Object.entries(allCommands)) {
        commands.push(commandDefToDraft(name, cmd, tab.id));
      }

      // Boot stages
      if (tab.bootSequence?.stages) {
        for (const stage of tab.bootSequence.stages) {
          bootStages.push({
            id: stage.id,
            tabId: tab.id,
            name: stage.name,
            lines: stage.lines || [],
            duration: stage.duration || 0,
            nextStage: stage.nextStage || '',
            prompt: stage.prompt || '',
          });
        }
      }

      // Filesystem
      if (tab.filesystem) {
        if (tab.filesystem.tree) {
          // Tree format — flatten to entries
          // Add root directory
          filesystemEntries.push({
            id: generateId('fs'),
            tabId: tab.id,
            path: '/',
            type: 'directory',
            content: '',
          });
          filesystemEntries.push(...flattenTreeToEntries(tab.filesystem.tree, tab.id));
        } else {
          // Flat format (backward compat)
          for (const dirPath of Object.keys(tab.filesystem.directories || {})) {
            filesystemEntries.push({
              id: generateId('fs'),
              tabId: tab.id,
              path: dirPath,
              type: 'directory',
              content: '',
            });
          }
          for (const [filePath, fileEntry] of Object.entries(tab.filesystem.files || {})) {
            const content = typeof fileEntry === 'string' ? fileEntry : (fileEntry.content || '');
            filesystemEntries.push({
              id: generateId('fs'),
              tabId: tab.id,
              path: filePath,
              type: 'file',
              content,
            });
          }
        }
      }
    }

    const flagParts: DraftFlagPart[] = (config.flags?.parts || []).map(f => ({
      id: f.id,
      part: f.part,
      description: f.description,
      hint: f.hint,
    }));

    set({
      tabs,
      commands,
      bootStages,
      filesystemEntries,
      flagParts,
      completeFlag: config.flags?.completeFlag || '',
      configName: config.metadata?.name || '',
      configDescription: config.metadata?.description || '',
      activeTabId: tabs[0]?.id || '',
      initialized: true,
    });
  },

  // ============================================
  // PERSISTENCE
  // ============================================

  applyTerminalConfig: () => {
    const config = get().exportAsTerminalConfig();
    localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(config));
    // Dispatch custom event for same-tab listeners (StorageEvent only fires cross-tab)
    window.dispatchEvent(new Event('terminal-config-updated'));
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(TERMINAL_STORAGE_KEY);
      if (saved) {
        const config: TerminalConfig = JSON.parse(saved);
        get().loadFromTerminalConfig(config);
      }
    } catch { /* ignore invalid data */ }
  },

  saveToFile: async () => {
    try {
      const config = get().exportAsTerminalConfig();
      const response = await fetch('/api/terminal-config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(config));
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  loadFromFile: async () => {
    try {
      const response = await fetch('/api/terminal-config/load');
      const result = await response.json();
      if (result.success && result.data) {
        localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(result.data));
        get().loadFromTerminalConfig(result.data);
        return { success: true, message: 'Configurazione terminale caricata' };
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  resetAll: () => {
    localStorage.removeItem(TERMINAL_STORAGE_KEY);
    set({
      tabs: [],
      commands: [],
      bootStages: [],
      filesystemEntries: [],
      flagParts: [],
      completeFlag: '',
      configName: '',
      configDescription: '',
      activeSection: 'commands',
      activeTabId: '',
      activeCommandId: null,
      editingCommandId: null,
      activeFlagPartId: null,
      activeBootStageId: null,
      activeFilesystemEntryId: null,
      initialized: false,
    });
  },
}),
    {
      name: TERMINAL_DRAFT_STORAGE_KEY,
      partialize: (state) => ({
        tabs: state.tabs,
        commands: state.commands,
        bootStages: state.bootStages,
        filesystemEntries: state.filesystemEntries,
        flagParts: state.flagParts,
        completeFlag: state.completeFlag,
        configName: state.configName,
        configDescription: state.configDescription,
        activeTabId: state.activeTabId,
        activeSection: state.activeSection,
        initialized: state.initialized,
      }),
      merge: (persisted: any, current) => {
        const merged = { ...current, ...(persisted as object) };
        // Migrate old filesystem entries: drop extraEntries (replaced by tree format)
        if (Array.isArray(merged.filesystemEntries)) {
          merged.filesystemEntries = merged.filesystemEntries.map((e: any) => {
            const { extraEntries, ...rest } = e;
            return rest;
          });
        }
        // Migrate old tabs that lack defaultBootStage
        if (Array.isArray(merged.tabs)) {
          merged.tabs = merged.tabs.map((t: any) => ({
            ...t,
            defaultBootStage: t.defaultBootStage || '',
          }));
        }
        // Migrate old commands that lack lookup fields
        if (Array.isArray(merged.commands)) {
          merged.commands = merged.commands.map((c: any) => ({
            ...c,
            lookupMatchType: c.lookupMatchType || 'contains',
            lookupArgIndex: c.lookupArgIndex ?? 0,
            lookupEntries: c.lookupEntries || [],
          }));
        }
        return merged;
      },
    },
  ),
);
