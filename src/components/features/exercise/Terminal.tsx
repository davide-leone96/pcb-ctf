// src/components/features/exercise/Terminal.tsx
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useExerciseStore } from '@/store/exerciseStore';
import { Monitor, Wifi } from 'lucide-react';
import { CommandExecutor } from '@/lib/terminal-command-executor';
import { TerminalConfigLoader } from '@/lib/terminal-config-loader';
import { registerBuiltinHandlers, getFileType, getStringsOutput } from '@/lib/terminal-builtin-handlers';
import { resolvePath, pathExists, isDirectory } from '@/lib/terminal-filesystem';
import { useTerminalConfig } from '@/hooks/useTerminalConfig';
import type { CommandContext } from '@/types/terminal-config';

// ============================================
// TYPES
// ============================================

/** Internal tab slot: 'primary' = first config tab, 'secondary' = second config tab */
type TabSlot = 'primary' | 'secondary';

type HistoryLine = {
  type: 'output' | 'input' | 'system' | 'flag' | 'error';
  content: string;
  prompt?: string;
};

// ============================================
// MODULE-LEVEL PERSISTED STATE (PRIMARY / SECONDARY)
// ============================================

let persistedPrimaryHistory: HistoryLine[] | null = null;
let persistedStage: string | null = null;
let persistedPrimaryPath = '/';
let persistedPrimaryCmdHistory: string[] = [];

let persistedSecondaryHistory: HistoryLine[] | null = null;
let persistedSecondaryPath = '/home/kali';
let persistedSecondaryCmdHistory: string[] = [];

// ============================================
// COMPONENT
// ============================================

interface TerminalProps {
  terminalComponentId?: string;
  /** Tab ID (from config) da attivare all'apertura del terminale */
  defaultTab?: string;
}

export default function Terminal({ terminalComponentId, defaultTab }: TerminalProps) {
  const { terminalDiscoveries, addTerminalDiscovery, completeTerminalChallenge, setTerminalCurrentFlag, setTerminalCompleteFlag, setTerminalObjectiveInfo } = useExerciseStore();

  // Load terminal config dynamically (localStorage → static fallback)
  const { config: terminalConfigDynamic } = useTerminalConfig(terminalComponentId);

  // Initialize configuration and executor (rebuild when config changes)
  const configLoader = useMemo(() => new TerminalConfigLoader(terminalConfigDynamic), [terminalConfigDynamic]);
  const executor = useMemo(() => {
    const exec = new CommandExecutor();
    registerBuiltinHandlers(exec);

    // Register custom functions
    exec.registerCustomFunction('getFileType', getFileType);
    exec.registerCustomFunction('getStringsOutput', getStringsOutput);

    return exec;
  }, []);

  // ============================================
  // DYNAMIC TAB MAPPING
  // ============================================

  const configTabs = useMemo(() => configLoader.getTabs(), [configLoader]);

  /** Map internal slot → actual config tab ID */
  const tabIdMap = useMemo(() => ({
    primary: configTabs[0]?.id || 'uart',
    secondary: configTabs[1]?.id || 'local',
  }), [configTabs]);

  /** Display info for each tab */
  const tabInfo = useMemo(() => ({
    primary: { name: configTabs[0]?.name || 'UART Console', icon: 'wifi' as const },
    secondary: { name: configTabs[1]?.name || 'Local Machine', icon: 'monitor' as const },
  }), [configTabs]);

  const hasTwoTabs = configTabs.length >= 2;

  /** Determine initial slot from defaultTab prop */
  const initialSlot = useMemo((): TabSlot => {
    if (!defaultTab) return 'primary';
    // Match by config tab ID
    if (defaultTab === tabIdMap.secondary) return 'secondary';
    if (defaultTab === tabIdMap.primary) return 'primary';
    // Legacy: match by old 'uart'/'local' names
    if (defaultTab === 'local' && hasTwoTabs) return 'secondary';
    return 'primary';
  }, [defaultTab, tabIdMap, hasTwoTabs]);

  // Tab state
  const [activeSlot, setActiveSlot] = useState<TabSlot>(initialSlot);

  /** The actual config tab ID for the currently active slot */
  const activeTabId = tabIdMap[activeSlot];

  // PRIMARY state
  const [primaryHistory, setPrimaryHistory] = useState<HistoryLine[]>(
    persistedPrimaryHistory || []
  );
  const [stage, setStage] = useState<string>(
    persistedStage || configLoader.getInitialBootStage(tabIdMap.primary) || 'connecting'
  );
  const [primaryPath, setPrimaryPath] = useState(
    persistedPrimaryPath !== '/' ? persistedPrimaryPath : (configLoader.getInitialPath(tabIdMap.primary) || '/')
  );
  const [primaryCmdHistory, setPrimaryCmdHistory] = useState<string[]>(persistedPrimaryCmdHistory);

  // SECONDARY state
  const [secondaryHistory, setSecondaryHistory] = useState<HistoryLine[]>(
    persistedSecondaryHistory || []
  );
  const [secondaryPath, setSecondaryPath] = useState(
    persistedSecondaryPath !== '/home/kali' ? persistedSecondaryPath : (configLoader.getInitialPath(tabIdMap.secondary) || '/home/kali')
  );
  const [secondaryCmdHistory, setSecondaryCmdHistory] = useState<string[]>(persistedSecondaryCmdHistory);

  // Input state
  const [currentInput, setCurrentInput] = useState('');
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState(-1);

  // UI state

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bootAnimRef = useRef<NodeJS.Timeout | null>(null);

  // Get current history and setHistory based on active slot
  const isPrimary = activeSlot === 'primary';
  const history = isPrimary ? primaryHistory : secondaryHistory;
  const setHistory = isPrimary ? setPrimaryHistory : setSecondaryHistory;

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Persist state
  useEffect(() => {
    persistedPrimaryHistory = primaryHistory;
    persistedStage = stage;
    persistedPrimaryPath = primaryPath;
    persistedPrimaryCmdHistory = primaryCmdHistory;
  }, [primaryHistory, stage, primaryPath, primaryCmdHistory]);

  useEffect(() => {
    persistedSecondaryHistory = secondaryHistory;
    persistedSecondaryPath = secondaryPath;
    persistedSecondaryCmdHistory = secondaryCmdHistory;
  }, [secondaryHistory, secondaryPath, secondaryCmdHistory]);

  // Focus input on mount and tab switch
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSlot]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (bootTimerRef.current) clearTimeout(bootTimerRef.current);
      if (bootAnimRef.current) clearInterval(bootAnimRef.current);
    };
  }, []);

  // Set terminal's completeFlag in the store so it can be included in the step flag
  useEffect(() => {
    const completeFlag = configLoader.getCompleteFlag();
    if (completeFlag) {
      setTerminalCompleteFlag(completeFlag);
    }
  }, [configLoader, setTerminalCompleteFlag]);

  // --- Flag discovery (uses store) ---
  const discoverFlag = useCallback(
    (flagId: string) => {
      if (terminalDiscoveries.includes(flagId)) return;
      addTerminalDiscovery(flagId);
    },
    [terminalDiscoveries, addTerminalDiscovery]
  );

  // Update progressive terminal flag and current sub-objective info in store
  useEffect(() => {
    const flagParts = configLoader.getFlagParts();
    // When all parts are discovered, show the author's completeFlag; otherwise build progressively
    const allDiscovered = flagParts.length > 0 && flagParts.every(fp => terminalDiscoveries.includes(fp.id));
    const currentFlag = allDiscovered
      ? (configLoader.getCompleteFlag() || configLoader.buildCurrentFlag(terminalDiscoveries))
      : configLoader.buildCurrentFlag(terminalDiscoveries);
    setTerminalCurrentFlag(currentFlag);

    // Find next undiscovered flag part → its description/hint become the current sub-objective
    const nextPart = flagParts.find(fp => !terminalDiscoveries.includes(fp.id));
    if (nextPart) {
      setTerminalObjectiveInfo(nextPart.description, nextPart.hint);
    } else if (flagParts.length > 0) {
      setTerminalObjectiveInfo('All flags discovered!', '');
    }
  }, [terminalDiscoveries, configLoader, setTerminalCurrentFlag, setTerminalObjectiveInfo]);

  // Complete objective when all flag parts are discovered
  useEffect(() => {
    const flagParts = configLoader.getFlagParts();
    if (flagParts.length > 0 && flagParts.every(fp => terminalDiscoveries.includes(fp.id))) {
      completeTerminalChallenge();
    }
  }, [terminalDiscoveries, configLoader, completeTerminalChallenge]);

  // ============================================
  // BOOT SEQUENCES (PRIMARY tab only)
  // ============================================

  useEffect(() => {
    if (activeSlot !== 'primary') return;

    const primaryTabId = tabIdMap.primary;
    const bootSequence = configLoader.getBootSequence(primaryTabId);
    if (!bootSequence) return;

    const currentStage = configLoader.getBootStage(primaryTabId, stage);
    if (!currentStage) return;

    // If stage has lines and duration, animate them
    if (currentStage.lines && currentStage.lines.length > 0 && currentStage.duration) {
      let lineIndex = 0;
      const lineDelay = currentStage.duration / currentStage.lines.length;

      bootAnimRef.current = setInterval(() => {
        if (lineIndex < currentStage.lines.length) {
          const line = currentStage.lines[lineIndex];
          setPrimaryHistory(prev => [...prev, { type: 'output', content: line }]);
          lineIndex++;
        } else {
          if (bootAnimRef.current) clearInterval(bootAnimRef.current);

          // Move to next stage if exists
          if (currentStage.nextStage) {
            bootTimerRef.current = setTimeout(() => {
              setStage(currentStage.nextStage!);
            }, 500);
          }
        }
      }, lineDelay);

      return () => {
        if (bootAnimRef.current) clearInterval(bootAnimRef.current);
      };
    }
  }, [stage, activeSlot, configLoader, tabIdMap.primary]);

  // ============================================
  // COMMAND EXECUTION
  // ============================================

  function executeCommand(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    const currentSetHistory = isPrimary ? setPrimaryHistory : setSecondaryHistory;

    // Build command context
    const parts = trimmed.split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    const currentPath = isPrimary ? primaryPath : secondaryPath;
    const filesystem = configLoader.getFilesystem(activeTabId);
    const environment = configLoader.getEnvironment(activeTabId);

    if (!filesystem) return;

    const context: CommandContext = {
      command: commandName,
      args,
      currentPath,
      filesystem,
      environment,
      bootStage: stage,
      discoveredFlags: terminalDiscoveries,
      history: isPrimary ? primaryCmdHistory : secondaryCmdHistory,
      state: {},
      tab: activeTabId,
    };

    // Add input to history
    const prompt = getPrompt();
    currentSetHistory(prev => [
      ...prev,
      { type: 'input', content: trimmed, prompt },
    ]);

    // Update command history
    if (isPrimary) {
      setPrimaryCmdHistory(prev => [...prev, trimmed]);
    } else {
      setSecondaryCmdHistory(prev => [...prev, trimmed]);
    }

    // Get command definition
    const commandDef = configLoader.getCommand(activeTabId, commandName);

    if (!commandDef) {
      currentSetHistory(prev => [
        ...prev,
        { type: 'error', content: `${commandName}: command not found` },
      ]);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // Execute command (synchronous)
    try {
      const result = executor.executeCommand(commandDef, context);

      if (!result.success) {
        currentSetHistory(prev => [
          ...prev,
          { type: 'error', content: result.error || 'Command failed' },
        ]);
        return;
      }

      // Handle special commands
      if (result.output.includes('__CLEAR__')) {
        currentSetHistory([]);
        return;
      }

      // Add output to history
      if (result.output.length > 0) {
        currentSetHistory(prev => [
          ...prev,
          ...result.output.map(line => ({ type: 'output' as const, content: line })),
        ]);
      }

      // Apply side effects
      if (result.sideEffects) {
        // Unlock flags
        if (result.sideEffects.newFlags) {
          result.sideEffects.newFlags.forEach((flagId: string) => {
            discoverFlag(flagId);
          });
        }

        // Apply state changes
        if (result.sideEffects.stateChanges) {
          const changes = result.sideEffects.stateChanges;

          // Change boot stage
          if (changes.bootStage) {
            setStage(changes.bootStage);
          }

          // Change path
          if (changes.currentPath) {
            if (isPrimary) {
              setPrimaryPath(changes.currentPath);
            } else {
              setSecondaryPath(changes.currentPath);
            }
          }
        }
      }

      // Handle cd command path change
      if (commandName === 'cd' && args.length > 0) {
        const targetPath = resolvePath(args[0], currentPath);
        if (pathExists(targetPath, filesystem) && isDirectory(targetPath, filesystem)) {
          if (isPrimary) {
            setPrimaryPath(targetPath);
          } else {
            setSecondaryPath(targetPath);
          }
        }
      }
    } catch (error: any) {
      currentSetHistory(prev => [
        ...prev,
        { type: 'error', content: error.message || 'Command execution error' },
      ]);
    }

    // Re-focus input after command execution
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // ============================================
  // INPUT HANDLING
  // ============================================

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const cmdHistory = isPrimary ? primaryCmdHistory : secondaryCmdHistory;

    if (e.key === 'Enter') {
      e.preventDefault();

      // Handle special boot stages (primary tab only)
      if (isPrimary) {
        if (stage === 'uboot_wait') {
          setStage('uboot_shell');
          setPrimaryHistory(prev => [...prev, { type: 'output', content: '' }]);
          setCurrentInput('');
          return;
        }

        if (stage === 'login') {
          const trimmed = currentInput.trim();
          setPrimaryHistory(prev => [
            ...prev,
            { type: 'input', content: trimmed, prompt: '(none) login: ' },
          ]);

          if (trimmed.toLowerCase() === 'root') {
            setStage('password');
          } else {
            setPrimaryHistory(prev => [
              ...prev,
              { type: 'output', content: 'Login incorrect' },
              { type: 'output', content: '' },
            ]);
          }

          setCurrentInput('');
          return;
        }

        if (stage === 'password') {
          const trimmed = currentInput.trim();
          setPrimaryHistory(prev => [
            ...prev,
            { type: 'input', content: '********', prompt: 'Password: ' },
          ]);

          if (trimmed === 'sohoadmin') {
            const primaryTabId = tabIdMap.primary;
            const shellStage = configLoader.getBootStage(primaryTabId, 'shell');
            if (shellStage?.lines) {
              setPrimaryHistory(prev => [
                ...prev,
                ...shellStage.lines.map(l => ({ type: 'output' as const, content: l })),
              ]);
            }
            setStage('shell');
            setPrimaryPath('/');
            discoverFlag('root');
          } else {
            setPrimaryHistory(prev => [
              ...prev,
              { type: 'output', content: 'Login incorrect' },
              { type: 'output', content: '' },
            ]);
            setStage('login');
          }

          setCurrentInput('');
          return;
        }
      }

      // Normal command execution
      executeCommand(currentInput);
      setCurrentInput('');
      setCmdHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const newIndex = cmdHistoryIndex < cmdHistory.length - 1 ? cmdHistoryIndex + 1 : cmdHistoryIndex;
      setCmdHistoryIndex(newIndex);
      setCurrentInput(cmdHistory[cmdHistory.length - 1 - newIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIndex <= 0) {
        setCmdHistoryIndex(-1);
        setCurrentInput('');
      } else {
        const newIndex = cmdHistoryIndex - 1;
        setCmdHistoryIndex(newIndex);
        setCurrentInput(cmdHistory[cmdHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  }

  // ============================================
  // TAB COMPLETION
  // ============================================

  function handleTabCompletion() {
    if (!currentInput) return;

    const filesystem = configLoader.getFilesystem(activeTabId);
    if (!filesystem) return;

    const curPath = isPrimary ? primaryPath : secondaryPath;
    const parts = currentInput.split(/\s+/);
    const lastPart = parts[parts.length - 1];

    if (!lastPart) return;

    const hasSlash = lastPart.includes('/');
    const dir = hasSlash
      ? resolvePath(lastPart.substring(0, lastPart.lastIndexOf('/') + 1) || '/', curPath)
      : curPath;
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
      setCurrentInput(parts.join(' '));
    } else if (matches.length > 1) {
      setHistory(prev => [...prev, { type: 'output', content: matches.join('  ') }]);
    }
  }

  // ============================================
  // PROMPT
  // ============================================

  function getPrompt(): string {
    if (!isPrimary) {
      const displayPath = secondaryPath.replace('/home/kali', '~');
      return `kali@local:${displayPath}$ `;
    }

    // Primary tab prompts - check if boot sequence exists
    const hasBootSequence = !!configLoader.getBootSequence(tabIdMap.primary);

    if (!hasBootSequence) {
      // No boot sequence: show a simple shell prompt
      return `${primaryPath} $ `;
    }

    // Boot sequence prompts
    if (stage === 'shell') {
      return `${primaryPath} # `;
    }

    switch (stage) {
      case 'uboot_wait': return '';
      case 'uboot_shell': return 'ar7100> ';
      case 'login': return '(none) login: ';
      case 'password': return 'Password: ';
      default: return '';
    }
  }

  // Input visibility: always visible for secondary tab and for primary without boot sequence
  const hasBootSequence = !!configLoader.getBootSequence(tabIdMap.primary);
  const isInputVisible =
    !isPrimary ||
    !hasBootSequence ||
    (isPrimary && ['uboot_wait', 'uboot_shell', 'login', 'password', 'shell'].includes(stage));

  const discoveredCount = terminalDiscoveries.length;
  const flagParts = configLoader.getFlagParts();

  // ============================================
  // TAB SWITCH
  // ============================================

  function switchTab(slot: TabSlot) {
    setActiveSlot(slot);
    setCurrentInput('');
    setCmdHistoryIndex(-1);
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative h-[500px] bg-black/95 rounded-lg overflow-hidden text-white font-mono text-xs flex flex-col animate-in fade-in duration-300 border border-green-900/50">
      {/* Header with tabs */}
      <div className="flex items-center bg-gray-900/80 px-1 select-none flex-shrink-0 border-b border-gray-700/50">
        {/* Primary tab (always visible) */}
        <button
          onClick={() => switchTab('primary')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 transition-colors ${
            activeSlot === 'primary'
              ? 'border-green-500 text-green-400 bg-gray-800/50'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Wifi className="h-3 w-3" />
          {tabInfo.primary.name}
        </button>

        {/* Secondary tab (only if config has 2+ tabs) */}
        {hasTwoTabs && (
          <button
            onClick={() => switchTab('secondary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 transition-colors ${
              activeSlot === 'secondary'
                ? 'border-blue-500 text-blue-400 bg-gray-800/50'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Monitor className="h-3 w-3" />
            {tabInfo.secondary.name}
          </button>
        )}

        <div className="flex-grow" />

        {/* Flag Progress */}
        <div className="flex items-center gap-1.5 mr-3">
          <div className="flex gap-0.5">
            {flagParts.map(fp => (
              <div
                key={fp.id}
                className={`w-3.5 h-2 rounded-sm transition-colors ${
                  terminalDiscoveries.includes(fp.id) ? 'bg-green-500' : 'bg-gray-700'
                }`}
                title={terminalDiscoveries.includes(fp.id) ? `${fp.part}: ${fp.description}` : fp.hint}
              />
            ))}
          </div>
          <span className="text-gray-500 text-xs">
            {discoveredCount}/{flagParts.length}
          </span>
        </div>
      </div>

      {/* Terminal content */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto p-2 space-y-0.5" onClick={() => inputRef.current?.focus()}>
        {history.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-words">
            {line.type === 'input' && line.prompt && (
              <span className="text-green-500">{line.prompt}</span>
            )}
            <span
              className={
                line.type === 'error'
                  ? 'text-red-400'
                  : line.type === 'system'
                  ? 'text-blue-400'
                  : line.type === 'flag'
                  ? 'text-yellow-400'
                  : line.type === 'input'
                  ? 'text-white'
                  : 'text-gray-300'
              }
            >
              {line.content}
            </span>
          </div>
        ))}

        {/* Current input line */}
        {isInputVisible && (
          <div className="flex items-center">
            <span className="text-green-500">{getPrompt()}</span>
            <input
              ref={inputRef}
              type={stage === 'password' ? 'password' : 'text'}
              value={currentInput}
              onChange={e => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow bg-transparent outline-none text-white caret-white ml-0.5"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}
      </div>

    </div>
  );
}
