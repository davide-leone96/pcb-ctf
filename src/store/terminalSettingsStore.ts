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
// DEFAULT BUILTIN COMMANDS
// ============================================

/** Template for the built-in commands that every new tab inherits. */
const DEFAULT_BUILTIN_COMMANDS: Omit<DraftCommand, 'id' | 'tabId'>[] = [
  {
    name: 'ls', description: 'List directory contents', aliases: [], handler: 'custom', builtinType: 'ls',
    bootStages: [], minArgs: 0, maxArgs: -1, outputType: 'none', staticLines: [], conditionalRules: [],
    defaultOutputLines: [], lookupMatchType: 'contains', lookupArgIndex: 0, lookupEntries: [], flagUnlocks: [], stateChanges: {},
  },
  {
    name: 'cd', description: 'Change directory', aliases: [], handler: 'custom', builtinType: 'cd',
    bootStages: [], minArgs: 0, maxArgs: 1, outputType: 'none', staticLines: [], conditionalRules: [],
    defaultOutputLines: [], lookupMatchType: 'contains', lookupArgIndex: 0, lookupEntries: [], flagUnlocks: [], stateChanges: {},
  },
  {
    name: 'pwd', description: 'Print working directory', aliases: [], handler: 'custom', builtinType: 'pwd',
    bootStages: [], minArgs: 0, maxArgs: 0, outputType: 'none', staticLines: [], conditionalRules: [],
    defaultOutputLines: [], lookupMatchType: 'contains', lookupArgIndex: 0, lookupEntries: [], flagUnlocks: [], stateChanges: {},
  },
  {
    name: 'cat', description: 'Display file contents', aliases: [], handler: 'custom', builtinType: 'cat',
    bootStages: [], minArgs: 1, maxArgs: -1, outputType: 'none', staticLines: [], conditionalRules: [],
    defaultOutputLines: [], lookupMatchType: 'contains', lookupArgIndex: 0, lookupEntries: [], flagUnlocks: [], stateChanges: {},
  },
  {
    name: 'grep', description: 'Search for patterns in files', aliases: [], handler: 'custom', builtinType: 'grep',
    bootStages: [], minArgs: 2, maxArgs: -1, outputType: 'none', staticLines: [], conditionalRules: [],
    defaultOutputLines: [], lookupMatchType: 'contains', lookupArgIndex: 0, lookupEntries: [], flagUnlocks: [], stateChanges: {},
  },
  {
    name: 'find', description: 'Search for files', aliases: [], handler: 'custom', builtinType: 'find',
    bootStages: [], minArgs: 0, maxArgs: -1, outputType: 'none', staticLines: [], conditionalRules: [],
    defaultOutputLines: [], lookupMatchType: 'contains', lookupArgIndex: 0, lookupEntries: [], flagUnlocks: [], stateChanges: {},
  },
  {
    name: 'clear', description: 'Clear the terminal screen', aliases: [], handler: 'custom', builtinType: 'clear',
    bootStages: [], minArgs: 0, maxArgs: 0, outputType: 'none', staticLines: [], conditionalRules: [],
    defaultOutputLines: [], lookupMatchType: 'contains', lookupArgIndex: 0, lookupEntries: [], flagUnlocks: [], stateChanges: {},
  },
];

/** Create DraftCommand instances for all built-in commands, bound to the given tabId. */
function createBuiltinCommandsForTab(tabId: string): DraftCommand[] {
  return DEFAULT_BUILTIN_COMMANDS.map(tpl => ({
    ...tpl,
    id: generateId('cmd'),
    tabId,
  }));
}

// ============================================
// DRAFT TYPES
// ============================================

/** A terminal component — a self-contained, reusable terminal config entity. */
export interface DraftTerminalComponent {
  id: string;
  name: string;
  description: string;
  completeFlag: string;
}

export interface DraftTab {
  id: string;
  terminalComponentId: string;
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
  terminalComponentId: string;
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
  // Terminal component entities
  terminalComponents: DraftTerminalComponent[];
  activeTerminalComponentId: string;

  // Data (scoped by active terminal component via tabs/flagParts)
  tabs: DraftTab[];
  commands: DraftCommand[];
  bootStages: DraftBootStage[];
  filesystemEntries: DraftFilesystemEntry[];
  flagParts: DraftFlagPart[];

  // UI state
  activeSection: TerminalSection;
  activeTabId: string;
  activeCommandId: string | null;
  editingCommandId: string | null;
  activeFlagPartId: string | null;
  activeBootStageId: string | null;
  activeFilesystemEntryId: string | null;
  initialized: boolean;
  previewOpen: boolean;

  // Terminal component CRUD
  addTerminalComponent: () => string;
  updateTerminalComponent: (id: string, data: Partial<Omit<DraftTerminalComponent, 'id'>>) => void;
  deleteTerminalComponent: (id: string) => void;
  setActiveTerminalComponentId: (id: string) => void;
  duplicateTerminalComponent: (id: string) => void;

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
  addFilesystemEntry: (tabId: string, type: 'file' | 'directory', defaultPath?: string) => void;
  updateFilesystemEntry: (id: string, data: Partial<DraftFilesystemEntry>) => void;
  deleteFilesystemEntry: (id: string) => void;

  // Migration
  normalizeBuiltinCommands: () => void;

  // UI actions
  setActiveSection: (section: TerminalSection) => void;
  setActiveTabId: (tabId: string) => void;
  setActiveCommandId: (id: string | null) => void;
  setEditingCommandId: (id: string | null) => void;
  setPreviewOpen: (open: boolean) => void;

  // Export / Import
  exportAsTerminalConfig: (componentId?: string) => TerminalConfig;
  exportAllTerminalConfigs: () => { id: string; name: string; config: TerminalConfig }[];
  loadFromTerminalConfig: (config: TerminalConfig, componentId?: string) => void;
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
    handler: 'custom',
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
    handler: draft.builtinType ? 'builtin' : 'custom',
    ...(draft.aliases.length > 0 ? { aliases: draft.aliases } : {}),
    ...(draft.builtinType ? { builtinType: draft.builtinType } : {}),
    ...(Object.keys(constraints).length > 0 ? { constraints } : {}),
    ...(output ? { output } : {}),
    ...(Object.keys(sideEffects).length > 0 ? { sideEffects } : {}),
  };

  return def;
}

/** Get tab IDs belonging to a terminal component. */
function getComponentTabIds(tabs: DraftTab[], componentId: string): string[] {
  return tabs.filter(t => t.terminalComponentId === componentId).map(t => t.id);
}

// ============================================
// STORE
// ============================================

export const useTerminalSettingsStore = create<TerminalSettingsState>()(
  persist(
    (set, get) => ({
  // Initial state
  terminalComponents: [],
  activeTerminalComponentId: '',
  tabs: [],
  commands: [],
  bootStages: [],
  filesystemEntries: [],
  flagParts: [],
  activeSection: 'commands',
  activeTabId: '',
  activeCommandId: null,
  editingCommandId: null,
  activeFlagPartId: null,
  activeBootStageId: null,
  activeFilesystemEntryId: null,
  initialized: false,
  previewOpen: false,

  // ============================================
  // TERMINAL COMPONENT CRUD
  // ============================================

  addTerminalComponent: () => {
    const id = generateId('tc');
    const count = get().terminalComponents.length;
    const newComp: DraftTerminalComponent = {
      id,
      name: `Terminal ${count + 1}`,
      description: '',
      completeFlag: '',
    };
    // Create a default tab with built-in commands
    const tabId = generateId('tab');
    const defaultTab: DraftTab = {
      id: tabId,
      terminalComponentId: id,
      name: 'Tab 1',
      initialPath: '/',
      environment: { USER: 'root', HOME: '/root', PATH: '/bin:/sbin:/usr/bin:/usr/sbin', SHELL: '/bin/sh' },
      defaultBootStage: '',
    };
    const builtinCmds = createBuiltinCommandsForTab(tabId);
    set({
      terminalComponents: [...get().terminalComponents, newComp],
      tabs: [...get().tabs, defaultTab],
      commands: [...get().commands, ...builtinCmds],
      activeTerminalComponentId: id,
      activeTabId: tabId,
    });
    return id;
  },

  updateTerminalComponent: (id, data) => {
    set({
      terminalComponents: get().terminalComponents.map(tc =>
        tc.id === id ? { ...tc, ...data } : tc
      ),
    });
  },

  deleteTerminalComponent: (id) => {
    const { terminalComponents, tabs, commands, bootStages, filesystemEntries, flagParts, activeTerminalComponentId } = get();
    // Get all tab IDs belonging to this component
    const compTabIds = new Set(getComponentTabIds(tabs, id));
    const remaining = terminalComponents.filter(tc => tc.id !== id);
    const newActiveId = activeTerminalComponentId === id
      ? (remaining[0]?.id || '')
      : activeTerminalComponentId;
    // Find first tab of the new active component for activeTabId
    const newActiveTabs = tabs.filter(t => t.terminalComponentId === newActiveId);

    set({
      terminalComponents: remaining,
      activeTerminalComponentId: newActiveId,
      tabs: tabs.filter(t => t.terminalComponentId !== id),
      commands: commands.filter(c => !compTabIds.has(c.tabId)),
      bootStages: bootStages.filter(b => !compTabIds.has(b.tabId)),
      filesystemEntries: filesystemEntries.filter(f => !compTabIds.has(f.tabId)),
      flagParts: flagParts.filter(fp => fp.terminalComponentId !== id),
      activeTabId: newActiveTabs[0]?.id || '',
    });
  },

  setActiveTerminalComponentId: (id) => {
    const { tabs } = get();
    const compTabs = tabs.filter(t => t.terminalComponentId === id);
    set({
      activeTerminalComponentId: id,
      activeTabId: compTabs[0]?.id || '',
      editingCommandId: null,
      activeCommandId: null,
      activeFlagPartId: null,
      activeBootStageId: null,
      activeFilesystemEntryId: null,
    });
  },

  duplicateTerminalComponent: (id) => {
    const { terminalComponents, tabs, commands, bootStages, filesystemEntries, flagParts } = get();
    const source = terminalComponents.find(tc => tc.id === id);
    if (!source) return;

    const newCompId = generateId('tc');
    const newComp: DraftTerminalComponent = {
      ...source,
      id: newCompId,
      name: `${source.name} (copy)`,
    };

    // Map old tab IDs to new tab IDs
    const tabIdMap = new Map<string, string>();
    const sourceTabs = tabs.filter(t => t.terminalComponentId === id);
    const newTabs: DraftTab[] = sourceTabs.map(t => {
      const newTabId = generateId('tab');
      tabIdMap.set(t.id, newTabId);
      return { ...t, id: newTabId, terminalComponentId: newCompId };
    });

    // Duplicate commands
    const sourceTabIds = new Set(sourceTabs.map(t => t.id));
    const newCommands: DraftCommand[] = commands
      .filter(c => sourceTabIds.has(c.tabId))
      .map(c => ({ ...c, id: generateId('cmd'), tabId: tabIdMap.get(c.tabId) || c.tabId }));

    // Duplicate boot stages
    const newBootStages: DraftBootStage[] = bootStages
      .filter(b => sourceTabIds.has(b.tabId))
      .map(b => ({ ...b, id: generateId('boot'), tabId: tabIdMap.get(b.tabId) || b.tabId }));

    // Duplicate filesystem entries
    const newFsEntries: DraftFilesystemEntry[] = filesystemEntries
      .filter(f => sourceTabIds.has(f.tabId))
      .map(f => ({ ...f, id: generateId('fs'), tabId: tabIdMap.get(f.tabId) || f.tabId }));

    // Duplicate flag parts
    const newFlagParts: DraftFlagPart[] = flagParts
      .filter(fp => fp.terminalComponentId === id)
      .map(fp => ({ ...fp, id: generateId('flag'), terminalComponentId: newCompId }));

    set({
      terminalComponents: [...terminalComponents, newComp],
      tabs: [...tabs, ...newTabs],
      commands: [...commands, ...newCommands],
      bootStages: [...bootStages, ...newBootStages],
      filesystemEntries: [...filesystemEntries, ...newFsEntries],
      flagParts: [...flagParts, ...newFlagParts],
      activeTerminalComponentId: newCompId,
      activeTabId: newTabs[0]?.id || '',
    });
  },

  // ============================================
  // TAB CRUD
  // ============================================

  addTab: () => {
    const { activeTerminalComponentId, tabs, commands } = get();
    if (!activeTerminalComponentId) return;
    const id = generateId('tab');
    const compTabs = tabs.filter(t => t.terminalComponentId === activeTerminalComponentId);
    const newTab: DraftTab = {
      id,
      terminalComponentId: activeTerminalComponentId,
      name: `Tab ${compTabs.length + 1}`,
      initialPath: '/',
      environment: { USER: 'root', HOME: '/root', PATH: '/bin:/sbin:/usr/bin:/usr/sbin', SHELL: '/bin/sh' },
      defaultBootStage: '',
    };
    const builtinCmds = createBuiltinCommandsForTab(id);
    set({ tabs: [...tabs, newTab], commands: [...commands, ...builtinCmds], activeTabId: id });
  },

  updateTab: (id, data) => {
    set({ tabs: get().tabs.map(t => t.id === id ? { ...t, ...data } : t) });
  },

  deleteTab: (id) => {
    const { tabs, commands, bootStages, filesystemEntries, activeTabId, activeTerminalComponentId } = get();
    const remainingTabs = tabs.filter(t => t.id !== id);
    const compTabs = remainingTabs.filter(t => t.terminalComponentId === activeTerminalComponentId);
    set({
      tabs: remainingTabs,
      commands: commands.filter(c => c.tabId !== id),
      bootStages: bootStages.filter(b => b.tabId !== id),
      filesystemEntries: filesystemEntries.filter(f => f.tabId !== id),
      activeTabId: activeTabId === id ? (compTabs[0]?.id || '') : activeTabId,
    });
  },

  // ============================================
  // MIGRATION
  // ============================================

  normalizeBuiltinCommands: () => {
    set({
      commands: get().commands.map(c =>
        c.handler === 'builtin' ? { ...c, handler: 'custom' } : c
      ),
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
    const { activeTerminalComponentId } = get();
    if (!activeTerminalComponentId) return;
    const id = generateId('flag');
    const newFlag: DraftFlagPart = { id, terminalComponentId: activeTerminalComponentId, part: '', description: '', hint: '' };
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

  updateCompleteFlag: (flag) => {
    const { activeTerminalComponentId, terminalComponents } = get();
    set({
      terminalComponents: terminalComponents.map(tc =>
        tc.id === activeTerminalComponentId ? { ...tc, completeFlag: flag } : tc
      ),
    });
  },

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

  addFilesystemEntry: (tabId, type, defaultPath) => {
    const id = generateId('fs');
    const path = defaultPath ?? (type === 'directory' ? '/new-dir' : '/new-file.txt');
    const newEntry: DraftFilesystemEntry = { id, tabId, path, type, content: '' };
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
  setPreviewOpen: (open) => set({ previewOpen: open }),

  // ============================================
  // EXPORT: Draft State -> TerminalConfig (for one component)
  // ============================================

  exportAsTerminalConfig: (componentId?: string): TerminalConfig => {
    const { terminalComponents, tabs, commands, bootStages, filesystemEntries, flagParts, activeTerminalComponentId } = get();
    const cid = componentId || activeTerminalComponentId;
    const comp = terminalComponents.find(tc => tc.id === cid);
    const compTabs = tabs.filter(t => t.terminalComponentId === cid);
    const compTabIds = new Set(compTabs.map(t => t.id));
    const compFlagParts = flagParts.filter(fp => fp.terminalComponentId === cid);

    const tabConfigs: TabConfig[] = compTabs.map(tab => {
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
        name: comp?.name || 'Terminal Configuration',
        description: comp?.description || '',
      },
      tabs: tabConfigs,
      ...(compFlagParts.length > 0 ? {
        flags: {
          parts: compFlagParts.map(f => ({ id: f.id, part: f.part, description: f.description, hint: f.hint })),
          completeFlag: comp?.completeFlag || '',
          showProgress: true,
        },
      } : {}),
    };
  },

  exportAllTerminalConfigs: () => {
    const { terminalComponents } = get();
    return terminalComponents.map(tc => ({
      id: tc.id,
      name: tc.name,
      config: get().exportAsTerminalConfig(tc.id),
    }));
  },

  // ============================================
  // IMPORT: TerminalConfig -> Draft State
  // ============================================

  loadFromTerminalConfig: (config: TerminalConfig, componentId?: string) => {
    const { terminalComponents, tabs: existingTabs, commands: existingCmds, bootStages: existingBoot, filesystemEntries: existingFs, flagParts: existingFlags } = get();

    // Determine which component to load into
    let cid = componentId;
    let updatedComponents = [...terminalComponents];

    if (!cid) {
      // No component specified — if store has no components, create one from the config
      if (terminalComponents.length === 0) {
        cid = generateId('tc');
        updatedComponents = [{
          id: cid,
          name: config.metadata?.name || 'Terminal Configuration',
          description: config.metadata?.description || '',
          completeFlag: config.flags?.completeFlag || '',
        }];
      } else {
        // Load into active component (replace its data)
        cid = get().activeTerminalComponentId || terminalComponents[0].id;
        updatedComponents = terminalComponents.map(tc =>
          tc.id === cid ? {
            ...tc,
            name: config.metadata?.name || tc.name,
            description: config.metadata?.description || tc.description,
            completeFlag: config.flags?.completeFlag || '',
          } : tc
        );
      }
    } else {
      // Component ID provided — ensure it exists in the array
      const existing = updatedComponents.find(tc => tc.id === cid);
      if (existing) {
        updatedComponents = updatedComponents.map(tc =>
          tc.id === cid ? {
            ...tc,
            name: config.metadata?.name || tc.name,
            description: config.metadata?.description || tc.description,
            completeFlag: config.flags?.completeFlag || '',
          } : tc
        );
      } else {
        updatedComponents = [...updatedComponents, {
          id: cid,
          name: config.metadata?.name || 'Terminal Configuration',
          description: config.metadata?.description || '',
          completeFlag: config.flags?.completeFlag || '',
        }];
      }
    }

    // Remove old data for this component
    const oldTabIds = new Set(getComponentTabIds(existingTabs, cid));
    const otherTabs = existingTabs.filter(t => t.terminalComponentId !== cid);
    const otherCmds = existingCmds.filter(c => !oldTabIds.has(c.tabId));
    const otherBoot = existingBoot.filter(b => !oldTabIds.has(b.tabId));
    const otherFs = existingFs.filter(f => !oldTabIds.has(f.tabId));
    const otherFlags = existingFlags.filter(fp => fp.terminalComponentId !== cid);

    // Build new data from config
    const newTabs: DraftTab[] = [];
    const newCommands: DraftCommand[] = [];
    const newBootStages: DraftBootStage[] = [];
    const newFilesystemEntries: DraftFilesystemEntry[] = [];

    for (const tab of config.tabs) {
      const defaultBootStage = (typeof tab.defaultConstraints?.state?.bootStage === 'string')
        ? tab.defaultConstraints.state.bootStage
        : '';

      newTabs.push({
        id: tab.id,
        terminalComponentId: cid,
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
        newCommands.push(commandDefToDraft(name, cmd, tab.id));
      }

      // Boot stages
      if (tab.bootSequence?.stages) {
        for (const stage of tab.bootSequence.stages) {
          newBootStages.push({
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
          newFilesystemEntries.push({
            id: generateId('fs'),
            tabId: tab.id,
            path: '/',
            type: 'directory',
            content: '',
          });
          newFilesystemEntries.push(...flattenTreeToEntries(tab.filesystem.tree, tab.id));
        } else {
          for (const dirPath of Object.keys(tab.filesystem.directories || {})) {
            newFilesystemEntries.push({
              id: generateId('fs'),
              tabId: tab.id,
              path: dirPath,
              type: 'directory',
              content: '',
            });
          }
          for (const [filePath, fileEntry] of Object.entries(tab.filesystem.files || {})) {
            const content = typeof fileEntry === 'string' ? fileEntry : (fileEntry.content || '');
            newFilesystemEntries.push({
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

    const newFlagParts: DraftFlagPart[] = (config.flags?.parts || []).map(f => ({
      id: f.id,
      terminalComponentId: cid!,
      part: f.part,
      description: f.description,
      hint: f.hint,
    }));

    set({
      terminalComponents: updatedComponents,
      activeTerminalComponentId: cid,
      tabs: [...otherTabs, ...newTabs],
      commands: [...otherCmds, ...newCommands],
      bootStages: [...otherBoot, ...newBootStages],
      filesystemEntries: [...otherFs, ...newFilesystemEntries],
      flagParts: [...otherFlags, ...newFlagParts],
      activeTabId: newTabs[0]?.id || '',
      initialized: true,
    });
  },

  // ============================================
  // PERSISTENCE
  // ============================================

  applyTerminalConfig: () => {
    // Export all terminal components as a bundle
    const bundle = get().exportAllTerminalConfigs();
    localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(bundle));
    // Dispatch custom event for same-tab listeners (StorageEvent only fires cross-tab)
    window.dispatchEvent(new Event('terminal-config-updated'));
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(TERMINAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if it's the new bundle format (array) or old single-config format
        if (Array.isArray(parsed)) {
          // New bundle format: [{id, name, config}]
          for (const entry of parsed) {
            get().loadFromTerminalConfig(entry.config, entry.id);
          }
        } else {
          // Old single-config format: TerminalConfig
          get().loadFromTerminalConfig(parsed as TerminalConfig);
        }
      }
    } catch { /* ignore invalid data */ }
  },

  saveToFile: async () => {
    try {
      const bundle = get().exportAllTerminalConfigs();
      const response = await fetch('/api/terminal-config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(bundle));
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
        const data = result.data;
        // Handle both formats
        if (Array.isArray(data)) {
          for (const entry of data) {
            get().loadFromTerminalConfig(entry.config, entry.id);
          }
        } else {
          get().loadFromTerminalConfig(data as TerminalConfig);
        }
        return { success: true, message: 'Terminal configuration loaded' };
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  resetAll: () => {
    localStorage.removeItem(TERMINAL_STORAGE_KEY);
    set({
      terminalComponents: [],
      activeTerminalComponentId: '',
      tabs: [],
      commands: [],
      bootStages: [],
      filesystemEntries: [],
      flagParts: [],
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
        terminalComponents: state.terminalComponents,
        activeTerminalComponentId: state.activeTerminalComponentId,
        tabs: state.tabs,
        commands: state.commands,
        bootStages: state.bootStages,
        filesystemEntries: state.filesystemEntries,
        flagParts: state.flagParts,
        activeTabId: state.activeTabId,
        activeSection: state.activeSection,
        initialized: state.initialized,
      }),
      merge: (persisted: any, current) => {
        const merged = { ...current, ...(persisted as object) };

        // Migrate: if persisted data has no terminalComponents, create a default one
        if (!Array.isArray(merged.terminalComponents) || merged.terminalComponents.length === 0) {
          // Old format — migrate all existing data into a single default component
          const hasData = (merged.tabs as any[])?.length > 0 || (merged.commands as any[])?.length > 0;
          if (hasData) {
            const compId = generateId('tc');
            merged.terminalComponents = [{
              id: compId,
              name: (merged as any).configName || 'Terminal Configuration',
              description: (merged as any).configDescription || '',
              completeFlag: (merged as any).completeFlag || '',
            }];
            merged.activeTerminalComponentId = compId;
            // Patch tabs to include terminalComponentId
            if (Array.isArray(merged.tabs)) {
              merged.tabs = merged.tabs.map((t: any) => ({
                ...t,
                terminalComponentId: t.terminalComponentId || compId,
                defaultBootStage: t.defaultBootStage || '',
              }));
            }
            // Patch flagParts to include terminalComponentId
            if (Array.isArray(merged.flagParts)) {
              merged.flagParts = merged.flagParts.map((fp: any) => ({
                ...fp,
                terminalComponentId: fp.terminalComponentId || compId,
              }));
            }
          } else {
            merged.terminalComponents = [];
            merged.activeTerminalComponentId = '';
          }
        }

        // Remove legacy global fields
        delete (merged as any).configName;
        delete (merged as any).configDescription;
        delete (merged as any).completeFlag;

        // Migrate old filesystem entries: drop extraEntries (replaced by tree format)
        if (Array.isArray(merged.filesystemEntries)) {
          merged.filesystemEntries = merged.filesystemEntries.map((e: any) => {
            const { extraEntries, ...rest } = e;
            return rest;
          });
        }
        // Migrate old tabs that lack defaultBootStage or terminalComponentId
        if (Array.isArray(merged.tabs)) {
          merged.tabs = merged.tabs.map((t: any) => ({
            ...t,
            defaultBootStage: t.defaultBootStage || '',
            terminalComponentId: t.terminalComponentId || merged.activeTerminalComponentId || '',
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
        // Migrate old flagParts that lack terminalComponentId
        if (Array.isArray(merged.flagParts)) {
          merged.flagParts = merged.flagParts.map((fp: any) => ({
            ...fp,
            terminalComponentId: fp.terminalComponentId || merged.activeTerminalComponentId || '',
          }));
        }
        // Ensure every tab has built-in commands (backfill for pre-builtin data)
        if (Array.isArray(merged.tabs) && Array.isArray(merged.commands)) {
          for (const tab of merged.tabs as any[]) {
            const tabCmds = (merged.commands as any[]).filter((c: any) => c.tabId === tab.id);
            const existingNames = new Set(tabCmds.map((c: any) => c.name));
            const missing = DEFAULT_BUILTIN_COMMANDS.filter(b => !existingNames.has(b.name));
            if (missing.length > 0) {
              for (const tpl of missing) {
                (merged.commands as any[]).push({ ...tpl, id: generateId('cmd'), tabId: tab.id });
              }
            }
          }
        }
        return merged;
      },
    },
  ),
);
