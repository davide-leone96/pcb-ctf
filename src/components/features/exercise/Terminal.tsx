// src/components/features/exercise/Terminal.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useExerciseStore } from '@/store/exerciseStore';
import { X, Terminal as TerminalIcon, Flag } from 'lucide-react';
import {
  UBOOT_BOOT_LINES,
  KERNEL_BOOT_LINES,
  UBOOT_PRINTENV,
  UBOOT_HELP,
  UBOOT_VERSION,
  UBOOT_MD,
  FS_DIRS,
  FILE_CONTENTS,
  STRINGS_OUTPUT,
  FILE_TYPES,
  PS_OUTPUT,
  MOUNT_OUTPUT,
  FLAG_PARTS,
  COMPLETE_FLAG,
} from '@/data/terminalData';

// ============================================
// TYPES
// ============================================

type TerminalStage = 'connecting' | 'booting' | 'uboot_wait' | 'uboot_shell' | 'kernel_boot' | 'login' | 'password' | 'shell';

type HistoryLine = {
  type: 'output' | 'input' | 'system' | 'flag' | 'error';
  content: string;
  prompt?: string;
};

// ============================================
// MODULE-LEVEL PERSISTED STATE
// ============================================

let persistedHistory: HistoryLine[] | null = null;
let persistedStage: TerminalStage | null = null;
let persistedDiscoveries: string[] = [];
let persistedPath = '/';
let persistedCmdHistory: string[] = [];

// ============================================
// HELPERS
// ============================================

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return '/' + resolved.join('/');
}

function resolvePath(input: string, currentPath: string): string {
  if (!input) return currentPath;
  if (input.startsWith('/')) return normalizePath(input);
  if (input === '..') {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }
  if (input === '.') return currentPath;
  return normalizePath(currentPath === '/' ? `/${input}` : `${currentPath}/${input}`);
}

function getLsOutput(args: string[], currentPath: string): string {
  let targetPath = currentPath;
  let longFormat = false;
  let showAll = false;

  for (const arg of args) {
    if (arg.startsWith('-')) {
      if (arg.includes('l')) longFormat = true;
      if (arg.includes('a')) showAll = true;
    } else {
      targetPath = resolvePath(arg, currentPath);
    }
  }

  const entries = FS_DIRS[targetPath];
  if (!entries) return `ls: ${targetPath}: No such file or directory`;

  if (longFormat) {
    const lines: string[] = [];
    if (showAll) {
      lines.push('drwxr-xr-x    2 root     root            0 .');
      lines.push('drwxr-xr-x    2 root     root            0 ..');
    }
    for (const entry of entries) {
      const entryPath = targetPath === '/' ? `/${entry}` : `${targetPath}/${entry}`;
      const isDir = FS_DIRS[entryPath] !== undefined;
      if (isDir) {
        lines.push(`drwxr-xr-x    2 root     root            0 ${entry}`);
      } else {
        const size = ((entry.length * 7919) % 99000) + 1000;
        lines.push(`-rwxr-xr-x    1 root     root       ${String(size).padStart(6)} ${entry}`);
      }
    }
    return lines.join('\n');
  }

  return entries.join('  ');
}

function getCommandOutput(cmd: string, args: string[], currentPath: string): string {
  switch (cmd) {
    case 'cat': {
      const path = resolvePath(args[0] || '', currentPath);
      return FILE_CONTENTS[path] || `cat: ${args[0]}: No such file or directory`;
    }
    case 'strings': {
      const path = resolvePath(args[0] || '', currentPath);
      return STRINGS_OUTPUT[path] || FILE_CONTENTS[path] || `strings: ${args[0]}: No such file`;
    }
    case 'ls': return getLsOutput(args, currentPath);
    case 'ps': return PS_OUTPUT;
    case 'mount': return MOUNT_OUTPUT;
    case 'echo': return args.join(' ');
    default: return '';
  }
}

// ============================================
// COMPONENT
// ============================================

const Terminal = () => {
  const { setActiveTool } = useExerciseStore();

  const [stage, setStage] = useState<TerminalStage>(persistedStage || 'connecting');
  const [history, setHistory] = useState<HistoryLine[]>(persistedHistory || []);
  const [currentInput, setCurrentInput] = useState('');
  const [currentPath, setCurrentPath] = useState(persistedPath);
  const [discoveries, setDiscoveries] = useState<Set<string>>(new Set(persistedDiscoveries));
  const [cmdHistory, setCmdHistory] = useState<string[]>(persistedCmdHistory);
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState(-1);
  const [bootTimer, setBootTimer] = useState(4);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bootTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bootAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // Persist state on changes
  useEffect(() => {
    persistedHistory = history;
    persistedStage = stage;
    persistedDiscoveries = Array.from(discoveries);
    persistedPath = currentPath;
    persistedCmdHistory = cmdHistory;
  }, [history, stage, discoveries, currentPath, cmdHistory]);

  // Auto-scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [stage, history]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (bootTimerRef.current) clearInterval(bootTimerRef.current);
      if (bootAnimRef.current) clearInterval(bootAnimRef.current);
    };
  }, []);

  // --- Flag discovery ---
  const discoverFlag = useCallback((flagId: string) => {
    setDiscoveries(prev => {
      if (prev.has(flagId)) return prev;
      const next = new Set(prev);
      next.add(flagId);
      const flag = FLAG_PARTS.find(f => f.id === flagId);
      if (flag) {
        setHistory(h => [...h, {
          type: 'flag' as const,
          content: `[!] FLAG PART DISCOVERED: ${flag.part} - ${flag.description}`
        }]);
      }
      return next;
    });
  }, []);

  // ============================================
  // BOOT SEQUENCES
  // ============================================

  // Stage: connecting
  useEffect(() => {
    if (stage !== 'connecting') return;
    if (persistedStage && persistedStage !== 'connecting') return;

    const t1 = setTimeout(() => {
      setHistory(prev => [...prev, { type: 'output', content: 'Connecting to UART (115200 baud, 8N1)...' }]);
    }, 300);

    const t2 = setTimeout(() => {
      setHistory(prev => [...prev, { type: 'output', content: 'Connected.\n' }]);
      setStage('booting');
    }, 1300);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [stage]);

  // Stage: booting (U-Boot lines)
  useEffect(() => {
    if (stage !== 'booting') return;

    let lineIndex = 0;
    bootAnimRef.current = setInterval(() => {
      if (lineIndex < UBOOT_BOOT_LINES.length) {
        const line = UBOOT_BOOT_LINES[lineIndex];
        setHistory(prev => [...prev, { type: 'output', content: line }]);
        lineIndex++;
      } else {
        if (bootAnimRef.current) clearInterval(bootAnimRef.current);
        setHistory(prev => [...prev, { type: 'system', content: 'Autobooting in 1 seconds' }]);
        setStage('uboot_wait');
      }
    }, 60);

    return () => { if (bootAnimRef.current) clearInterval(bootAnimRef.current); };
  }, [stage]);

  // Stage: uboot_wait (countdown for "tpl")
  useEffect(() => {
    if (stage !== 'uboot_wait') return;

    let count = 4;
    setBootTimer(4);

    bootTimerRef.current = setInterval(() => {
      count--;
      setBootTimer(count);
      if (count <= 0) {
        if (bootTimerRef.current) clearInterval(bootTimerRef.current);
        setStage('kernel_boot');
      }
    }, 1000);

    return () => { if (bootTimerRef.current) clearInterval(bootTimerRef.current); };
  }, [stage]);

  // Stage: kernel_boot
  useEffect(() => {
    if (stage !== 'kernel_boot') return;

    let lineIndex = 0;
    bootAnimRef.current = setInterval(() => {
      if (lineIndex < KERNEL_BOOT_LINES.length) {
        const line = KERNEL_BOOT_LINES[lineIndex];
        setHistory(prev => [...prev, { type: 'output', content: line }]);
        lineIndex++;
      } else {
        if (bootAnimRef.current) clearInterval(bootAnimRef.current);
        setHistory(prev => [...prev,
          { type: 'output', content: '' },
          { type: 'system', content: '(none) login: ' }
        ]);
        setStage('login');
      }
    }, 80);

    return () => { if (bootAnimRef.current) clearInterval(bootAnimRef.current); };
  }, [stage]);

  // ============================================
  // INPUT HANDLER (dispatches by stage)
  // ============================================

  function handleInput(input: string) {
    const trimmed = input.trim();

    switch (stageRef.current) {
      case 'uboot_wait':
        if (trimmed.toLowerCase() === 'tpl') {
          if (bootTimerRef.current) clearInterval(bootTimerRef.current);
          setHistory(prev => [...prev,
            { type: 'input', content: 'tpl', prompt: '' },
            { type: 'system', content: 'Boot interrupted.' },
          ]);
          setStage('uboot_shell');
        }
        break;

      case 'uboot_shell':
        handleUbootCommand(trimmed);
        break;

      case 'login':
        setHistory(prev => [...prev, { type: 'input', content: trimmed, prompt: '(none) login: ' }]);
        if (trimmed === 'root') {
          setStage('password');
        } else {
          setHistory(prev => [...prev,
            { type: 'output', content: 'Login incorrect' },
            { type: 'output', content: '' },
            { type: 'system', content: '(none) login: ' },
          ]);
        }
        break;

      case 'password':
        setHistory(prev => [...prev, { type: 'input', content: '********', prompt: 'Password: ' }]);
        if (trimmed === 'sohoadmin') {
          setHistory(prev => [...prev,
            { type: 'output', content: '' },
            { type: 'output', content: 'BusyBox v1.01 (2015.06.16-06:24+0000) Built-in shell (ash)' },
            { type: 'output', content: "Enter 'help' for a list of built-in commands." },
            { type: 'output', content: '' },
          ]);
          discoverFlag('root');
          setCurrentPath('/');
          setStage('shell');
        } else {
          setHistory(prev => [...prev,
            { type: 'output', content: 'Login incorrect' },
            { type: 'output', content: '' },
            { type: 'system', content: '(none) login: ' },
          ]);
          setStage('login');
        }
        break;

      case 'shell':
        handleShellCommand(trimmed);
        break;
    }
  }

  // ============================================
  // U-BOOT COMMANDS
  // ============================================

  function handleUbootCommand(cmd: string) {
    setHistory(prev => [...prev, { type: 'input', content: cmd, prompt: 'ar7100> ' }]);

    const command = cmd.split(/\s+/)[0]?.toLowerCase();

    switch (command) {
      case 'help':
      case '?':
        setHistory(prev => [...prev, { type: 'output', content: UBOOT_HELP }]);
        break;
      case 'printenv':
        setHistory(prev => [...prev, { type: 'output', content: UBOOT_PRINTENV }]);
        discoverFlag('boot');
        break;
      case 'version':
        setHistory(prev => [...prev, { type: 'output', content: UBOOT_VERSION }]);
        break;
      case 'boot':
      case 'bootm':
        setStage('kernel_boot');
        break;
      case 'reset':
        setHistory([]);
        setStage('connecting');
        break;
      case 'md':
        setHistory(prev => [...prev, { type: 'output', content: UBOOT_MD }]);
        break;
      case 'setenv':
        break;
      case '':
        break;
      default:
        setHistory(prev => [...prev, { type: 'output', content: `Unknown command '${cmd}' - try 'help'` }]);
    }
  }

  // ============================================
  // SHELL COMMANDS
  // ============================================

  function handleShellCommand(input: string) {
    const prompt = '# ';

    if (input) {
      setCmdHistory(prev => [...prev, input]);
      setCmdHistoryIndex(-1);
    }

    setHistory(prev => [...prev, { type: 'input', content: input, prompt }]);

    if (!input) return;

    // Handle pipes
    if (input.includes('|')) {
      handlePipedCommand(input);
      return;
    }

    const parts = input.split(/\s+/);
    executeCommand(parts[0], parts.slice(1));
  }

  function handlePipedCommand(input: string) {
    const commands = input.split('|').map(c => c.trim());
    if (commands.length < 2) return;

    const firstParts = commands[0].split(/\s+/);
    const secondParts = commands[1].split(/\s+/);

    const firstOutput = getCommandOutput(firstParts[0], firstParts.slice(1), currentPath);

    let result = '';
    if (secondParts[0] === 'grep' && secondParts[1]) {
      const pattern = secondParts[1];
      result = firstOutput.split('\n').filter(line =>
        line.toLowerCase().includes(pattern.toLowerCase())
      ).join('\n');
    } else if (secondParts[0] === 'head') {
      const n = parseInt(secondParts[1]?.replace('-', '') || '10');
      result = firstOutput.split('\n').slice(0, n).join('\n');
    } else if (secondParts[0] === 'tail') {
      const n = parseInt(secondParts[1]?.replace('-', '') || '10');
      const lines = firstOutput.split('\n');
      result = lines.slice(Math.max(0, lines.length - n)).join('\n');
    } else if (secondParts[0] === 'wc') {
      result = `      ${firstOutput.split('\n').length}`;
    } else {
      result = `sh: ${secondParts[0]}: not found`;
    }

    if (result) {
      setHistory(prev => [...prev, { type: 'output', content: result }]);
    }

    // Check flag discoveries from piped strings output
    if (firstParts[0] === 'strings') {
      const target = resolvePath(firstParts[1] || '', currentPath);
      if (target.includes('mtdblock3') && result.length > 0) discoverFlag('leak');
      if (target.includes('httpd') && result.includes('execFormatCmd')) discoverFlag('inject');
      if (target.includes('backdoorTest') && result.length > 0) discoverFlag('shell');
    }
  }

  function executeCommand(cmd: string, args: string[]) {
    switch (cmd) {
      case 'ls':
        setHistory(prev => [...prev, { type: 'output', content: getLsOutput(args, currentPath) }]);
        break;

      case 'cd': {
        const target = args[0] || '/root';
        const newPath = resolvePath(target, currentPath);
        if (FS_DIRS[newPath] !== undefined) {
          setCurrentPath(newPath);
        } else {
          setHistory(prev => [...prev, { type: 'output', content: `sh: cd: ${target}: No such file or directory` }]);
        }
        break;
      }

      case 'pwd':
        setHistory(prev => [...prev, { type: 'output', content: currentPath }]);
        break;

      case 'cat': {
        const path = resolvePath(args[0] || '', currentPath);
        const content = FILE_CONTENTS[path];
        if (content) {
          setHistory(prev => [...prev, { type: 'output', content }]);
          if (path === '/etc/shadow') discoverFlag('hash');
        } else if (FS_DIRS[path] !== undefined) {
          setHistory(prev => [...prev, { type: 'output', content: `cat: ${args[0]}: Is a directory` }]);
        } else if (FILE_TYPES[path]) {
          setHistory(prev => [...prev, { type: 'output', content: `cat: ${args[0]}: binary file, use 'strings' or 'file' to analyze` }]);
        } else {
          setHistory(prev => [...prev, { type: 'output', content: `cat: ${args[0]}: No such file or directory` }]);
        }
        break;
      }

      case 'file': {
        const path = resolvePath(args[0] || '', currentPath);
        const fileType = FILE_TYPES[path];
        if (fileType) {
          setHistory(prev => [...prev, { type: 'output', content: fileType }]);
          if (path === '/usr/bin/backdoorTest') discoverFlag('shell');
        } else if (FS_DIRS[path] !== undefined) {
          setHistory(prev => [...prev, { type: 'output', content: `${args[0]}: directory` }]);
        } else if (FILE_CONTENTS[path]) {
          setHistory(prev => [...prev, { type: 'output', content: `${args[0]}: ASCII text` }]);
        } else {
          setHistory(prev => [...prev, { type: 'output', content: `${args[0]}: cannot open (No such file or directory)` }]);
        }
        break;
      }

      case 'strings': {
        const path = resolvePath(args[0] || '', currentPath);
        const output = STRINGS_OUTPUT[path];
        if (output) {
          setHistory(prev => [...prev, { type: 'output', content: output }]);
          if (path.includes('mtdblock3')) discoverFlag('leak');
          if (path.includes('httpd')) discoverFlag('inject');
          if (path.includes('backdoorTest')) discoverFlag('shell');
        } else if (FILE_CONTENTS[path]) {
          setHistory(prev => [...prev, { type: 'output', content: FILE_CONTENTS[path] }]);
        } else {
          setHistory(prev => [...prev, { type: 'output', content: `strings: ${args[0]}: No such file` }]);
        }
        break;
      }

      case 'mount':
        setHistory(prev => [...prev, { type: 'output', content: MOUNT_OUTPUT }]);
        break;

      case 'ps':
        setHistory(prev => [...prev, { type: 'output', content: PS_OUTPUT }]);
        break;

      case 'whoami':
        setHistory(prev => [...prev, { type: 'output', content: 'root' }]);
        break;

      case 'id':
        setHistory(prev => [...prev, { type: 'output', content: 'uid=0(root) gid=0(root)' }]);
        break;

      case 'uname':
        if (args.includes('-a')) {
          setHistory(prev => [...prev, { type: 'output', content: 'Linux (none) 2.6.31 #61 Tue Jun 16 14:17:33 CST 2015 mips GNU/Linux' }]);
        } else {
          setHistory(prev => [...prev, { type: 'output', content: 'Linux' }]);
        }
        break;

      case 'hostname':
        setHistory(prev => [...prev, { type: 'output', content: '(none)' }]);
        break;

      case 'ifconfig':
        setHistory(prev => [...prev, {
          type: 'output', content: `br0       Link encap:Ethernet  HWaddr 84:16:F9:2A:80:7C
          inet addr:192.168.0.1  Bcast:192.168.0.255  Mask:255.255.255.0
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1

eth0      Link encap:Ethernet  HWaddr 84:16:F9:2A:80:7C
          UP BROADCAST RUNNING PROMISC MULTICAST  MTU:1500  Metric:1

eth1      Link encap:Ethernet  HWaddr 84:16:F9:2A:80:7D
          UP BROADCAST MULTICAST  MTU:1500  Metric:1

lo        Link encap:Local Loopback
          inet addr:127.0.0.1  Mask:255.0.0.0
          UP LOOPBACK RUNNING  MTU:16436  Metric:1`
        }]);
        break;

      case 'df':
        setHistory(prev => [...prev, {
          type: 'output', content: `Filesystem           1k-blocks      Used Available Use% Mounted on
/dev/root                 2816      2816         0 100% /
ramfs                    14236        32     14204   0% /tmp`
        }]);
        break;

      case 'free':
        setHistory(prev => [...prev, {
          type: 'output', content: `              total         used         free       shared      buffers
  Mem:        28472        17188        11284            0          868
 Swap:            0            0            0
Total:        28472        17188        11284`
        }]);
        break;

      case 'hashcat': {
        const hash = args.find(a => a.startsWith('$1$'));
        if (hash) {
          setHistory(prev => [...prev, {
            type: 'output', content: `hashcat v3.00

Initializing hashcat...
Parsing Hashes: 1 (1 found)
Loading rules...

$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:sohoadmin

Session..........: hashcat
Status...........: Cracked
Hash.Type........: md5crypt
Input.Mode.......: Dictionary
Time.Started.....: 00:00:02
Speed.Dev.#1.....: 12345 H/s
Recovered........: 1/1 (100.00%)
Progress.........: 1000/1000 (100.00%)`
          }]);
          discoverFlag('hash');
        } else {
          setHistory(prev => [...prev, { type: 'output', content: 'Usage: hashcat [options] <hash|hashfile> [dictionary|mask]' }]);
        }
        break;
      }

      case 'grep': {
        if (args.length < 2) {
          setHistory(prev => [...prev, { type: 'output', content: 'Usage: grep PATTERN [FILE]...' }]);
          break;
        }
        const pattern = args[0];
        const filePath = resolvePath(args[1], currentPath);
        const content = FILE_CONTENTS[filePath];
        if (content) {
          const matches = content.split('\n').filter(line =>
            line.toLowerCase().includes(pattern.toLowerCase())
          );
          if (matches.length) {
            setHistory(prev => [...prev, { type: 'output', content: matches.join('\n') }]);
          }
        } else {
          setHistory(prev => [...prev, { type: 'output', content: `grep: ${args[1]}: No such file or directory` }]);
        }
        break;
      }

      case 'find': {
        const searchPath = resolvePath(args[0] || '.', currentPath);
        const nameIdx = args.indexOf('-name');
        if (nameIdx === -1 || !args[nameIdx + 1]) {
          setHistory(prev => [...prev, { type: 'output', content: 'Usage: find <path> -name <pattern>' }]);
          break;
        }
        const namePattern = args[nameIdx + 1].replace(/\*/g, '').replace(/"/g, '').replace(/'/g, '');
        const results: string[] = [];
        const searchDir = (dirPath: string) => {
          const entries = FS_DIRS[dirPath];
          if (!entries) return;
          for (const entry of entries) {
            const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`;
            if (entry.toLowerCase().includes(namePattern.toLowerCase())) {
              results.push(fullPath);
            }
            if (FS_DIRS[fullPath]) searchDir(fullPath);
          }
        };
        searchDir(searchPath);
        setHistory(prev => [...prev, { type: 'output', content: results.join('\n') || 'find: no matches' }]);
        break;
      }

      case 'help':
        setHistory(prev => [...prev, {
          type: 'output', content: `Built-in commands:
  ls, cd, pwd, cat, file, strings, mount, ps, whoami, id
  uname, hostname, ifconfig, df, free, grep, find, echo
  hashcat, lsmod, date, uptime, clear, help, exit, reboot`
        }]);
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'exit':
      case 'logout':
        setHistory(prev => [...prev, { type: 'system', content: 'Disconnecting...' }]);
        setTimeout(() => setActiveTool('pointer'), 500);
        break;

      case 'reboot':
        setHistory([]);
        setStage('connecting');
        break;

      case 'echo':
        setHistory(prev => [...prev, { type: 'output', content: args.join(' ') }]);
        break;

      case 'date':
        setHistory(prev => [...prev, { type: 'output', content: 'Tue Jun 16 14:30:00 CST 2015' }]);
        break;

      case 'uptime':
        setHistory(prev => [...prev, { type: 'output', content: ' 14:30:00 up 10:37, load average: 0.08, 0.03, 0.01' }]);
        break;

      case 'lsmod':
        setHistory(prev => [...prev, {
          type: 'output', content: `Module                  Size  Used by
umac                  218772  0
ath_dev                83264  1 umac
ath_rate_atheros       4416   1 umac
ath_hal               198212  2 ath_dev,ath_rate_atheros
adf                    5632   1 ath_dev
ag7240_mod            32116   0`
        }]);
        break;

      case '':
        break;

      default:
        setHistory(prev => [...prev, { type: 'output', content: `sh: ${cmd}: not found` }]);
    }
  }

  // ============================================
  // KEY HANDLING
  // ============================================

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleInput(currentInput);
      setCurrentInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIndex = cmdHistoryIndex < cmdHistory.length - 1 ? cmdHistoryIndex + 1 : cmdHistoryIndex;
        setCmdHistoryIndex(newIndex);
        setCurrentInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIndex > 0) {
        setCmdHistoryIndex(cmdHistoryIndex - 1);
        setCurrentInput(cmdHistory[cmdHistory.length - cmdHistoryIndex]);
      } else {
        setCmdHistoryIndex(-1);
        setCurrentInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    }
  }

  function handleTabCompletion() {
    const parts = currentInput.split(/\s+/);
    const lastPart = parts[parts.length - 1];
    if (!lastPart) return;

    const hasSlash = lastPart.includes('/');
    const dir = hasSlash
      ? resolvePath(lastPart.substring(0, lastPart.lastIndexOf('/') + 1) || '/', currentPath)
      : currentPath;
    const prefix = hasSlash
      ? lastPart.substring(lastPart.lastIndexOf('/') + 1)
      : lastPart;

    const entries = FS_DIRS[dir];
    if (!entries) return;

    const matches = entries.filter(e => e.startsWith(prefix));
    if (matches.length === 1) {
      const completion = hasSlash
        ? lastPart.substring(0, lastPart.lastIndexOf('/') + 1) + matches[0]
        : matches[0];
      const entryPath = dir === '/' ? `/${matches[0]}` : `${dir}/${matches[0]}`;
      parts[parts.length - 1] = completion + (FS_DIRS[entryPath] ? '/' : '');
      setCurrentInput(parts.join(' '));
    } else if (matches.length > 1) {
      setHistory(prev => [...prev, { type: 'output', content: matches.join('  ') }]);
    }
  }

  // ============================================
  // PROMPT
  // ============================================

  function getPrompt(): string {
    switch (stage) {
      case 'uboot_wait': return '';
      case 'uboot_shell': return 'ar7100> ';
      case 'login': return '(none) login: ';
      case 'password': return 'Password: ';
      case 'shell': return '# ';
      default: return '';
    }
  }

  const isInputVisible = ['uboot_wait', 'uboot_shell', 'login', 'password', 'shell'].includes(stage);
  const discoveredCount = discoveries.size;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="fixed bottom-0 left-0 right-0 h-2/5 bg-black/95 backdrop-blur-sm z-40 text-white font-mono text-xs flex flex-col animate-in slide-in-from-bottom-10 duration-300 border-t border-green-900/50">
      {/* Header */}
      <div className="flex items-center bg-gray-900/80 px-3 py-1.5 select-none flex-shrink-0 border-b border-gray-700/50">
        <TerminalIcon className="h-3.5 w-3.5 mr-2 text-green-500" />
        <span className="flex-grow text-green-400 text-xs">UART Console - 115200 baud 8N1</span>

        {/* Flag Progress */}
        <div className="flex items-center gap-2 mr-4">
          <Flag className="h-3 w-3 text-yellow-500" />
          <div className="flex gap-0.5">
            {FLAG_PARTS.map(fp => (
              <div
                key={fp.id}
                className={`w-4 h-2 rounded-sm transition-colors ${discoveries.has(fp.id) ? 'bg-green-500' : 'bg-gray-700'}`}
                title={discoveries.has(fp.id) ? `${fp.part}: ${fp.description}` : fp.hint}
              />
            ))}
          </div>
          <span className="text-gray-500 text-xs">{discoveredCount}/{FLAG_PARTS.length}</span>
        </div>

        <button onClick={() => setActiveTool('pointer')} className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Terminal Body */}
      <div
        className="flex-grow p-2 overflow-y-auto cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, index) => (
          <div key={index} className="leading-tight">
            {line.type === 'input' ? (
              <div className="flex">
                <span className="text-green-500 flex-shrink-0">{line.prompt}</span>
                <span className="text-white">{line.content}</span>
              </div>
            ) : line.type === 'flag' ? (
              <div className="bg-green-900/30 border border-green-700/50 rounded px-2 py-1 my-1 text-green-400 font-bold">
                {line.content}
              </div>
            ) : line.type === 'system' ? (
              <span className="text-yellow-500">{line.content}</span>
            ) : line.type === 'error' ? (
              <span className="text-red-400">{line.content}</span>
            ) : (
              <pre className="whitespace-pre-wrap text-gray-300 m-0">{line.content}</pre>
            )}
          </div>
        ))}

        {/* U-Boot wait indicator */}
        {stage === 'uboot_wait' && (
          <div className="text-yellow-400 animate-pulse">
            Hit &apos;tpl&apos; to stop autoboot: {bootTimer}
          </div>
        )}

        {/* Input Line */}
        {isInputVisible && (
          <div className="flex items-center">
            <span className="text-green-500 flex-shrink-0">{getPrompt()}</span>
            <input
              ref={inputRef}
              type={stage === 'password' ? 'password' : 'text'}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none text-white w-full focus:outline-none focus:ring-0 p-0 font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
        )}

        {/* Complete flag display */}
        {discoveredCount === FLAG_PARTS.length && (
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded px-3 py-2 mt-2">
            <div className="text-yellow-400 font-bold text-sm">CONGRATULATIONS! All flag parts discovered!</div>
            <div className="text-yellow-300 mt-1 text-base font-mono">{COMPLETE_FLAG}</div>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

export default Terminal;
