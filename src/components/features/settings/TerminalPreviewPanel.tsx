// src/components/features/settings/TerminalPreviewPanel.tsx
'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import { CommandExecutor } from '@/lib/terminal-command-executor';
import { TerminalConfigLoader } from '@/lib/terminal-config-loader';
import { registerBuiltinHandlers, getFileType, getStringsOutput } from '@/lib/terminal-builtin-handlers';
import { resolvePath, pathExists, isDirectory } from '@/lib/terminal-filesystem';
import type { CommandContext, TerminalConfig } from '@/types/terminal-config';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type HistoryLine = {
  type: 'output' | 'input' | 'error' | 'system';
  content: string;
  prompt?: string;
};

type TabState = {
  history: HistoryLine[];
  path: string;
  cmdHistory: string[];
  shellState: Record<string, any>;
  flags: string[];
};

function makeTabState(loader: TerminalConfigLoader, tabId: string): TabState {
  return {
    history: [],
    path: loader.getInitialPath(tabId),
    cmdHistory: [],
    shellState: {},
    flags: [],
  };
}

// ============================================
// INNER TERMINAL
// ============================================

function TerminalInner({ config }: { config: TerminalConfig }) {
  const configLoader = useMemo(() => new TerminalConfigLoader(config), [config]);

  const executor = useMemo(() => {
    const exec = new CommandExecutor();
    registerBuiltinHandlers(exec);
    exec.registerCustomFunction('getFileType', getFileType);
    exec.registerCustomFunction('getStringsOutput', getStringsOutput);
    return exec;
  }, []);

  const tabs = configLoader.getTabs();

  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? '');

  // Stage is separate from tabState so boot effect only triggers on stage change
  const [stages, setStages] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const tab of tabs) {
      result[tab.id] = configLoader.getInitialBootStage(tab.id) || '';
    }
    return result;
  });

  const [tabStates, setTabStates] = useState<Record<string, TabState>>(() => {
    const result: Record<string, TabState> = {};
    for (const tab of tabs) {
      result[tab.id] = makeTabState(configLoader, tab.id);
    }
    return result;
  });

  const [input, setInput] = useState('');
  const [cmdHistIdx, setCmdHistIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStage = stages[activeTabId] ?? '';
  const curTab = tabStates[activeTabId];

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [curTab?.history]);

  // Focus on tab switch
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTabId]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (bootAnimRef.current) clearInterval(bootAnimRef.current);
      if (bootTimerRef.current) clearTimeout(bootTimerRef.current);
    };
  }, []);

  // Boot sequence animation
  useEffect(() => {
    if (bootAnimRef.current) clearInterval(bootAnimRef.current);
    if (bootTimerRef.current) clearTimeout(bootTimerRef.current);

    if (!activeStage) return;

    const bootStage = configLoader.getBootStage(activeTabId, activeStage);
    if (!bootStage) return;

    if (!bootStage.lines?.length || !bootStage.duration) return;

    let lineIndex = 0;
    const lineDelay = bootStage.duration / bootStage.lines.length;

    bootAnimRef.current = setInterval(() => {
      if (lineIndex < bootStage.lines.length) {
        const line = bootStage.lines[lineIndex];
        setTabStates(prev => ({
          ...prev,
          [activeTabId]: {
            ...prev[activeTabId],
            history: [...prev[activeTabId].history, { type: 'output', content: line }],
          },
        }));
        lineIndex++;
      } else {
        if (bootAnimRef.current) clearInterval(bootAnimRef.current);
        if (bootStage.nextStage) {
          bootTimerRef.current = setTimeout(() => {
            setStages(prev => ({ ...prev, [activeTabId]: bootStage.nextStage! }));
          }, 300);
        }
      }
    }, lineDelay);

    return () => {
      if (bootAnimRef.current) clearInterval(bootAnimRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, activeTabId]);

  // ============================================
  // PROMPT
  // ============================================

  function getPrompt(): string {
    if (activeStage) {
      const bootStageDef = configLoader.getBootStage(activeTabId, activeStage);
      if (bootStageDef?.prompt) return bootStageDef.prompt;
    }
    const path = curTab?.path ?? '/';
    return `root@${activeTabId}:${path}# `;
  }

  const isInputVisible = (() => {
    if (!curTab) return false;
    if (!activeStage) return true;
    const bootStageDef = configLoader.getBootStage(activeTabId, activeStage);
    if (!bootStageDef) return true;
    if (bootStageDef.prompt) return true;
    return !bootStageDef.lines?.length || !bootStageDef.duration;
  })();

  // ============================================
  // COMMAND EXECUTION
  // ============================================

  const updateTab = useCallback((tabId: string, updater: (prev: TabState) => TabState) => {
    setTabStates(prev => ({ ...prev, [tabId]: updater(prev[tabId]) }));
  }, []);

  function executeCmd(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || !curTab) return;

    const parts = trimmed.split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    const filesystem = configLoader.getFilesystem(activeTabId);
    const environment = configLoader.getEnvironment(activeTabId);
    if (!filesystem) return;

    const prompt = getPrompt();
    updateTab(activeTabId, prev => ({
      ...prev,
      history: [...prev.history, { type: 'input', content: trimmed, prompt }],
      cmdHistory: [...prev.cmdHistory, trimmed],
    }));

    const context: CommandContext = {
      command: commandName,
      args,
      currentPath: curTab.path,
      filesystem,
      environment,
      bootStage: activeStage,
      discoveredFlags: curTab.flags,
      history: curTab.cmdHistory,
      state: curTab.shellState,
      tab: activeTabId,
    };

    const commandDef = configLoader.getCommand(activeTabId, commandName);
    if (!commandDef) {
      updateTab(activeTabId, prev => ({
        ...prev,
        history: [...prev.history, { type: 'error', content: `${commandName}: command not found` }],
      }));
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    try {
      const result = executor.executeCommand(commandDef, context);

      if (!result.success) {
        updateTab(activeTabId, prev => ({
          ...prev,
          history: [...prev.history, { type: 'error', content: result.error || 'Command failed' }],
        }));
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }

      if (result.output.includes('__CLEAR__')) {
        updateTab(activeTabId, prev => ({ ...prev, history: [] }));
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }

      updateTab(activeTabId, prev => {
        const next = { ...prev };
        if (result.output.length > 0) {
          next.history = [
            ...prev.history,
            ...result.output.map(line => ({ type: 'output' as const, content: line })),
          ];
        }
        if (result.sideEffects?.newFlags) {
          next.flags = [...new Set([...prev.flags, ...result.sideEffects.newFlags])];
        }
        if (result.sideEffects?.stateChanges) {
          const ch = result.sideEffects.stateChanges;
          if (ch.currentPath) next.path = ch.currentPath;
          next.shellState = { ...prev.shellState, ...ch };
        }
        return next;
      });

      if (result.sideEffects?.stateChanges?.bootStage) {
        setStages(prev => ({ ...prev, [activeTabId]: result.sideEffects!.stateChanges!.bootStage }));
      }

      if (commandName === 'cd' && args.length > 0) {
        const targetPath = resolvePath(args[0], curTab.path);
        if (pathExists(targetPath, filesystem) && isDirectory(targetPath, filesystem)) {
          updateTab(activeTabId, prev => ({ ...prev, path: targetPath }));
        }
      }
    } catch (err: any) {
      updateTab(activeTabId, prev => ({
        ...prev,
        history: [...prev.history, { type: 'error', content: err.message || 'Execution error' }],
      }));
    }

    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // ============================================
  // INPUT HANDLING
  // ============================================

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const cmdHist = curTab?.cmdHistory ?? [];

    if (e.key === 'Enter') {
      e.preventDefault();
      executeCmd(input);
      setInput('');
      setCmdHistIdx(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cmdHist.length) return;
      const newIdx = cmdHistIdx < cmdHist.length - 1 ? cmdHistIdx + 1 : cmdHistIdx;
      setCmdHistIdx(newIdx);
      setInput(cmdHist[cmdHist.length - 1 - newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistIdx <= 0) { setCmdHistIdx(-1); setInput(''); return; }
      const newIdx = cmdHistIdx - 1;
      setCmdHistIdx(newIdx);
      setInput(cmdHist[cmdHist.length - 1 - newIdx] || '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      updateTab(activeTabId, prev => ({ ...prev, history: [] }));
    }
  }

  function handleTabCompletion() {
    if (!input || !curTab) return;
    const filesystem = configLoader.getFilesystem(activeTabId);
    if (!filesystem) return;

    const parts = input.split(/\s+/);
    const lastPart = parts[parts.length - 1];
    if (!lastPart) return;

    const hasSlash = lastPart.includes('/');
    const dir = hasSlash
      ? resolvePath(lastPart.substring(0, lastPart.lastIndexOf('/') + 1) || '/', curTab.path)
      : curTab.path;
    const prefix = hasSlash ? lastPart.substring(lastPart.lastIndexOf('/') + 1) : lastPart;

    const entries = filesystem.directories[dir];
    if (!entries) return;

    const matches = entries.filter(e => e.startsWith(prefix));
    if (matches.length === 1) {
      const completion = hasSlash
        ? lastPart.substring(0, lastPart.lastIndexOf('/') + 1) + matches[0]
        : matches[0];
      const entryPath = dir === '/' ? `/${matches[0]}` : `${dir}/${matches[0]}`;
      parts[parts.length - 1] = completion + (filesystem.directories[entryPath] ? '/' : '');
      setInput(parts.join(' '));
    } else if (matches.length > 1) {
      updateTab(activeTabId, prev => ({
        ...prev,
        history: [...prev.history, { type: 'output', content: matches.join('  ') }],
      }));
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (!tabs.length) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-500 italic">
        Nessun tab configurato
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black/90 overflow-hidden font-mono text-xs">
      {/* Tab bar */}
      <div className="flex items-center bg-gray-900/80 border-b border-gray-700/50 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTabId(tab.id); setInput(''); setCmdHistIdx(-1); }}
            className={cn(
              'px-3 py-1.5 text-xs border-b-2 transition-colors',
              activeTabId === tab.id
                ? 'border-green-500 text-green-400 bg-gray-800/50'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            )}
          >
            {tab.name}
          </button>
        ))}
        {/* Flag progress */}
        {curTab && curTab.flags.length > 0 && (
          <div className="ml-auto pr-2 flex items-center gap-1">
            {configLoader.getFlagParts().map(fp => (
              <div
                key={fp.id}
                className={cn(
                  'w-3 h-1.5 rounded-sm',
                  curTab.flags.includes(fp.id) ? 'bg-green-500' : 'bg-gray-700'
                )}
                title={fp.part}
              />
            ))}
          </div>
        )}
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0"
        onClick={() => inputRef.current?.focus()}
      >
        {curTab?.history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-words leading-relaxed">
            {line.type === 'input' && line.prompt && (
              <span className="text-green-500">{line.prompt}</span>
            )}
            <span className={cn(
              line.type === 'error' && 'text-red-400',
              line.type === 'system' && 'text-blue-400',
              line.type === 'input' && 'text-white',
              line.type === 'output' && 'text-gray-300',
            )}>
              {line.content}
            </span>
          </div>
        ))}

        {isInputVisible && (
          <div className="flex items-center">
            <span className="text-green-500">{getPrompt()}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-white caret-white ml-0.5"
              spellCheck={false}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// OUTER PANEL — fixed bottom overlay
// ============================================

export default function TerminalPreviewPanel() {
  const store = useTerminalSettingsStore();
  // Config snapshot taken once on mount; terminal only resets when panel is closed and reopened
  const [config] = useState<TerminalConfig>(() => store.exportAsTerminalConfig());

  return (
    <div className="fixed bottom-0 left-0 right-0 h-2/5 bg-black/95 backdrop-blur-sm z-40 flex flex-col border-t border-green-900/50 animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 bg-gray-900/80 px-3 py-1.5 border-b border-gray-700/50 flex-shrink-0 select-none">
        <span className="text-xs text-green-400 font-mono font-medium">Preview Config</span>
        <span className="text-[10px] text-gray-500">
          Ctrl+L pulire · Tab completamento · ↑↓ storia
        </span>
        <button
          onClick={() => store.setPreviewOpen(false)}
          className="ml-auto p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
          title="Chiudi preview"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Terminal fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <TerminalInner config={config} />
      </div>
    </div>
  );
}
