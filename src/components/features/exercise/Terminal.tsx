// src/components/features/exercise/Terminal.tsx
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useExerciseStore } from '@/store/exerciseStore';
import { Monitor, Wifi } from 'lucide-react';
import TerminalChallengeCompleteDialog from './TerminalChallengeCompleteDialog';
import { CommandExecutor } from '@/lib/terminal-command-executor';
import { TerminalConfigLoader } from '@/lib/terminal-config-loader';
import { registerBuiltinHandlers, getFileType, getStringsOutput } from '@/lib/terminal-builtin-handlers';
import { resolvePath, pathExists, isDirectory } from '@/lib/terminal-filesystem';
import { useTerminalConfig } from '@/hooks/useTerminalConfig';
import type { CommandContext } from '@/types/terminal-config';

// ============================================
// TYPES
// ============================================

type TerminalTab = 'uart' | 'local';

type HistoryLine = {
  type: 'output' | 'input' | 'system' | 'flag' | 'error';
  content: string;
  prompt?: string;
};

// ============================================
// MODULE-LEVEL PERSISTED STATE (UART)
// ============================================

let persistedUartHistory: HistoryLine[] | null = null;
let persistedStage: string | null = null;
let persistedUartPath = '/';
let persistedUartCmdHistory: string[] = [];

// MODULE-LEVEL PERSISTED STATE (LOCAL)
let persistedLocalHistory: HistoryLine[] | null = null;
let persistedLocalPath = '/home/kali';
let persistedLocalCmdHistory: string[] = [];

// ============================================
// COMPONENT
// ============================================

export default function Terminal() {
  const { terminalDiscoveries, addTerminalDiscovery } = useExerciseStore();

  // Load terminal config dynamically (localStorage → static fallback)
  const { config: terminalConfigDynamic } = useTerminalConfig();

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

  // Tab state
  const [activeTab, setActiveTab] = useState<TerminalTab>('uart');

  // UART state
  const [uartHistory, setUartHistory] = useState<HistoryLine[]>(
    persistedUartHistory || []
  );
  const [stage, setStage] = useState<string>(
    persistedStage || configLoader.getInitialBootStage('uart') || 'connecting'
  );
  const [uartPath, setUartPath] = useState(persistedUartPath);
  const [uartCmdHistory, setUartCmdHistory] = useState<string[]>(persistedUartCmdHistory);

  // Local state
  const [localHistory, setLocalHistory] = useState<HistoryLine[]>(
    persistedLocalHistory || []
  );
  const [localPath, setLocalPath] = useState(persistedLocalPath);
  const [localCmdHistory, setLocalCmdHistory] = useState<string[]>(persistedLocalCmdHistory);

  // Input state
  const [currentInput, setCurrentInput] = useState('');
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState(-1);

  // UI state
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bootAnimRef = useRef<NodeJS.Timeout | null>(null);

  // Get current history and setHistory based on active tab
  const history = activeTab === 'uart' ? uartHistory : localHistory;
  const setHistory = activeTab === 'uart' ? setUartHistory : setLocalHistory;

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Persist state
  useEffect(() => {
    persistedUartHistory = uartHistory;
    persistedStage = stage;
    persistedUartPath = uartPath;
    persistedUartCmdHistory = uartCmdHistory;
  }, [uartHistory, stage, uartPath, uartCmdHistory]);

  useEffect(() => {
    persistedLocalHistory = localHistory;
    persistedLocalPath = localPath;
    persistedLocalCmdHistory = localCmdHistory;
  }, [localHistory, localPath, localCmdHistory]);

  // Focus input on mount and tab switch
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (bootTimerRef.current) clearTimeout(bootTimerRef.current);
      if (bootAnimRef.current) clearInterval(bootAnimRef.current);
    };
  }, []);

  // --- Flag discovery (uses store) ---
  const discoverFlag = useCallback(
    (flagId: string) => {
      if (terminalDiscoveries.includes(flagId)) return;
      addTerminalDiscovery(flagId);
      // Flag piece will appear silently in the flag box above (no terminal feedback)
    },
    [terminalDiscoveries, addTerminalDiscovery]
  );

  // Show completion dialog when all flag parts are discovered
  useEffect(() => {
    const flagParts = configLoader.getFlagParts();
    if (terminalDiscoveries.length === flagParts.length && flagParts.length > 0) {
      setShowCompleteDialog(true);
    }
  }, [terminalDiscoveries, configLoader]);

  // ============================================
  // BOOT SEQUENCES (UART only)
  // ============================================

  useEffect(() => {
    if (activeTab !== 'uart') return;

    const bootSequence = configLoader.getBootSequence('uart');
    if (!bootSequence) return;

    const currentStage = configLoader.getBootStage('uart', stage);
    if (!currentStage) return;

    // If stage has lines and duration, animate them
    if (currentStage.lines && currentStage.lines.length > 0 && currentStage.duration) {
      let lineIndex = 0;
      const lineDelay = currentStage.duration / currentStage.lines.length;

      bootAnimRef.current = setInterval(() => {
        if (lineIndex < currentStage.lines.length) {
          const line = currentStage.lines[lineIndex];
          setUartHistory(prev => [...prev, { type: 'output', content: line }]);
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
  }, [stage, activeTab, configLoader]);

  // ============================================
  // COMMAND EXECUTION
  // ============================================

  function executeCommand(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    const isUart = activeTab === 'uart';
    const tabId = activeTab;
    const currentSetHistory = isUart ? setUartHistory : setLocalHistory;

    // Build command context
    const parts = trimmed.split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    const currentPath = isUart ? uartPath : localPath;
    const filesystem = configLoader.getFilesystem(tabId);
    const environment = configLoader.getEnvironment(tabId);

    if (!filesystem) return;

    const context: CommandContext = {
      command: commandName,
      args,
      currentPath,
      filesystem,
      environment,
      bootStage: stage,
      discoveredFlags: terminalDiscoveries,
      history: isUart ? uartCmdHistory : localCmdHistory,
      state: {},
      tab: tabId,
    };

    // Add input to history
    const prompt = getPrompt();
    currentSetHistory(prev => [
      ...prev,
      { type: 'input', content: trimmed, prompt },
    ]);

    // Update command history
    if (isUart) {
      setUartCmdHistory(prev => [...prev, trimmed]);
    } else {
      setLocalCmdHistory(prev => [...prev, trimmed]);
    }

    // Get command definition
    const commandDef = configLoader.getCommand(tabId, commandName);

    if (!commandDef) {
      currentSetHistory(prev => [
        ...prev,
        { type: 'error', content: `${commandName}: command not found` },
      ]);
      // Re-focus input
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
            if (isUart) {
              setUartPath(changes.currentPath);
            } else {
              setLocalPath(changes.currentPath);
            }
          }
        }
      }

      // Handle cd command path change
      if (commandName === 'cd' && args.length > 0) {
        const targetPath = resolvePath(args[0], currentPath);
        if (pathExists(targetPath, filesystem) && isDirectory(targetPath, filesystem)) {
          if (isUart) {
            setUartPath(targetPath);
          } else {
            setLocalPath(targetPath);
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
    const cmdHistory = activeTab === 'uart' ? uartCmdHistory : localCmdHistory;

    if (e.key === 'Enter') {
      e.preventDefault();

      // Handle special boot stages
      if (activeTab === 'uart') {
        if (stage === 'uboot_wait') {
          // Stop autoboot and go to U-Boot shell
          setStage('uboot_shell');
          setUartHistory(prev => [...prev, { type: 'output', content: '' }]);
          setCurrentInput('');
          return;
        }

        if (stage === 'login') {
          // Handle login
          const trimmed = currentInput.trim();
          setUartHistory(prev => [
            ...prev,
            { type: 'input', content: trimmed, prompt: '(none) login: ' },
          ]);

          if (trimmed.toLowerCase() === 'root') {
            setStage('password');
          } else {
            setUartHistory(prev => [
              ...prev,
              { type: 'output', content: 'Login incorrect' },
              { type: 'output', content: '' },
            ]);
          }

          setCurrentInput('');
          return;
        }

        if (stage === 'password') {
          // Handle password
          const trimmed = currentInput.trim();
          setUartHistory(prev => [
            ...prev,
            { type: 'input', content: '********', prompt: 'Password: ' },
          ]);

          if (trimmed === 'sohoadmin') {
            // Successful login
            const shellStage = configLoader.getBootStage('uart', 'shell');
            if (shellStage?.lines) {
              setUartHistory(prev => [
                ...prev,
                ...shellStage.lines.map(l => ({ type: 'output' as const, content: l })),
              ]);
            }
            setStage('shell');
            setUartPath('/');
            discoverFlag('root');
          } else {
            setUartHistory(prev => [
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

    const tabId = activeTab;
    const filesystem = configLoader.getFilesystem(tabId);
    if (!filesystem) return;

    const curPath = activeTab === 'uart' ? uartPath : localPath;
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
    if (activeTab === 'local') {
      const displayPath = localPath.replace('/home/kali', '~');
      return `kali@local:${displayPath}$ `;
    }

    // UART prompts - shell stage needs dynamic path
    if (stage === 'shell') {
      return `${uartPath} # `;
    }

    switch (stage) {
      case 'uboot_wait': return '';
      case 'uboot_shell': return 'ar7100> ';
      case 'login': return '(none) login: ';
      case 'password': return 'Password: ';
      default: return '';
    }
  }

  const isInputVisible =
    activeTab === 'local' ||
    (activeTab === 'uart' && ['uboot_wait', 'uboot_shell', 'login', 'password', 'shell'].includes(stage));

  const discoveredCount = terminalDiscoveries.length;
  const flagParts = configLoader.getFlagParts();

  // ============================================
  // TAB SWITCH
  // ============================================

  function switchTab(tab: TerminalTab) {
    setActiveTab(tab);
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
        {/* Tabs */}
        <button
          onClick={() => switchTab('uart')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 transition-colors ${
            activeTab === 'uart'
              ? 'border-green-500 text-green-400 bg-gray-800/50'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Wifi className="h-3 w-3" />
          UART Console
        </button>
        <button
          onClick={() => switchTab('local')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 transition-colors ${
            activeTab === 'local'
              ? 'border-blue-500 text-blue-400 bg-gray-800/50'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Monitor className="h-3 w-3" />
          Local Machine
        </button>

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

      {/* Completion Dialog */}
      <TerminalChallengeCompleteDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        flag={configLoader.getCompleteFlag()}
      />
    </div>
  );
}
