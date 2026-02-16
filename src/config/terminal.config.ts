// src/config/terminal.config.ts
/**
 * Terminal Configuration
 * Complete configuration for customizable terminal behavior
 */

import type { TerminalConfig } from '@/types/terminal-config';
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
  LOCAL_FS_DIRS,
  LOCAL_FILE_CONTENTS,
} from '@/data/terminalData';

export const terminalConfig: TerminalConfig = {
  metadata: {
    version: '1.0.0',
    name: 'TP-Link WR841N Penetration Testing Terminal',
    description: 'Interactive terminal simulator for embedded device security testing',
    author: 'ARTIC CTF Platform',
  },

  // ========================================
  // GLOBAL COMMANDS (available in all tabs)
  // ========================================
  globalCommands: {
    ls: {
      description: 'List directory contents',
      handler: 'builtin',
      builtinType: 'ls',
    },
    cd: {
      description: 'Change directory',
      handler: 'builtin',
      builtinType: 'cd',
      constraints: {
        arguments: { max: 1 },
      },
    },
    pwd: {
      description: 'Print working directory',
      handler: 'builtin',
      builtinType: 'pwd',
    },
    cat: {
      description: 'Concatenate and display file contents',
      handler: 'builtin',
      builtinType: 'cat',
      constraints: {
        arguments: { min: 1 },
      },
    },
    clear: {
      description: 'Clear terminal screen',
      handler: 'builtin',
      builtinType: 'clear',
    },
  },

  flags: {
    parts: FLAG_PARTS,
    completeFlag: COMPLETE_FLAG,
    showProgress: true,
    completionMessage: 'Congratulations! You have discovered all flag parts and completed the challenge!',
  },

  tabs: [
    // ========================================
    // UART TAB (Device Console)
    // ========================================
    {
      id: 'uart',
      name: 'UART Console',
      initialPath: '/',
      defaultConstraints: {
        state: { bootStage: 'shell' },
      },

      filesystem: {
        directories: FS_DIRS,
        files: FILE_CONTENTS,
        fileDefaults: { permissions: '-rw-r--r--', owner: 'root' },
      },

      bootSequence: {
        initialStage: 'connecting',
        stages: [
          {
            id: 'connecting',
            name: 'Connecting',
            lines: ['Connecting to UART interface...', 'Waiting for device boot...'],
            duration: 1500,
            nextStage: 'booting',
          },
          {
            id: 'booting',
            name: 'Booting',
            lines: UBOOT_BOOT_LINES,
            duration: 2000,
            nextStage: 'uboot_wait',
          },
          {
            id: 'uboot_wait',
            name: 'U-Boot Wait',
            lines: ['', 'Hit any key to stop autoboot:  3'],
            duration: 1000,
            nextStage: 'uboot_shell',
            prompt: 'Press Enter to access U-Boot console',
          },
          {
            id: 'uboot_shell',
            name: 'U-Boot Shell',
            lines: ['', 'U-Boot> '],
            prompt: 'U-Boot> ',
          },
          {
            id: 'kernel_boot',
            name: 'Kernel Boot',
            lines: KERNEL_BOOT_LINES,
            duration: 2500,
            nextStage: 'login',
          },
          {
            id: 'login',
            name: 'Login Prompt',
            lines: ['', 'TP-LINK login: '],
            prompt: 'Login: ',
          },
          {
            id: 'password',
            name: 'Password Prompt',
            lines: [],
            prompt: 'Password: ',
          },
          {
            id: 'shell',
            name: 'Shell',
            lines: [
              '',
              'BusyBox v1.01 (2015.06.16-06:24+0000) Built-in shell (ash)',
              "Enter 'help' for a list of built-in commands.",
              '',
            ],
            prompt: '# ',
          },
        ],
      },

      commands: {
        // ========================================
        // U-BOOT COMMANDS
        // ========================================
        '?': {
          aliases: ['help'],
          description: 'Print online help',
          handler: 'custom',
          constraints: {
            state: {
              bootStage: 'uboot_shell',
            },
          },
          output: {
            type: 'static',
            lines: UBOOT_HELP.split('\n'),
          },
        },

        printenv: {
          description: 'Print environment variables',
          handler: 'custom',
          constraints: {
            state: {
              bootStage: 'uboot_shell',
            },
          },
          output: {
            type: 'static',
            lines: UBOOT_PRINTENV.split('\n'),
          },
          sideEffects: {
            unlockFlags: ['boot'],
          },
        },

        version: {
          description: 'Print monitor version',
          handler: 'custom',
          constraints: {
            state: {
              bootStage: 'uboot_shell',
            },
          },
          output: {
            type: 'static',
            lines: [UBOOT_VERSION],
          },
        },

        md: {
          description: 'Memory display',
          handler: 'custom',
          constraints: {
            state: {
              bootStage: 'uboot_shell',
            },
          },
          output: {
            type: 'static',
            lines: UBOOT_MD.split('\n'),
          },
        },

        boot: {
          description: 'Boot default, i.e., run bootcmd',
          handler: 'custom',
          constraints: {
            state: {
              bootStage: 'uboot_shell',
            },
          },
          output: {
            type: 'static',
            lines: ['## Booting with bootargs', 'Starting kernel boot sequence...'],
          },
          sideEffects: {
            setState: {
              bootStage: 'kernel_boot',
            },
          },
        },

        // ========================================
        // SHELL COMMANDS - File Operations
        // (ls, cd, pwd, cat, clear are in globalCommands)
        // ========================================
        file: {
          description: 'Determine file type',
          handler: 'custom',
          constraints: {
            arguments: { min: 1 },
          },
          output: {
            type: 'lookup',
            argIndex: 0,
            matchType: 'equals',
            table: {
              '/usr/bin/backdoorTest': [FILE_TYPES['/usr/bin/backdoorTest'] || 'file: not found'],
            },
            default: {
              type: 'dynamic',
              generator: 'getFileType',
            },
          },
          sideEffects: {
            unlockFlags: [
              {
                id: 'shell',
                condition: {
                  type: 'argument',
                  index: 0,
                  equals: '/usr/bin/backdoorTest',
                },
              },
            ],
          },
        },

        strings: {
          description: 'Print printable characters in files',
          handler: 'custom',
          constraints: {
            arguments: { min: 1 },
          },
          output: {
            type: 'lookup',
            argIndex: 0,
            matchType: 'contains',
            table: {
              'mtdblock3': (STRINGS_OUTPUT['/dev/mtdblock3'] || '').split('\n'),
              'httpd': (STRINGS_OUTPUT['/usr/sbin/httpd'] || '').split('\n'),
              'backdoorTest': (STRINGS_OUTPUT['/usr/bin/backdoorTest'] || '').split('\n'),
            },
            default: {
              type: 'dynamic',
              generator: 'getStringsOutput',
            },
          },
          sideEffects: {
            unlockFlags: [
              {
                id: 'leak',
                condition: {
                  type: 'argument',
                  index: 0,
                  contains: 'mtdblock3',
                },
              },
              {
                id: 'inject',
                condition: {
                  type: 'argument',
                  index: 0,
                  contains: 'httpd',
                },
              },
              {
                id: 'shell',
                condition: {
                  type: 'argument',
                  index: 0,
                  contains: 'backdoorTest',
                },
              },
            ],
          },
        },

        // ========================================
        // SHELL COMMANDS - System Info
        // ========================================
        mount: {
          description: 'Mount filesystems',
          handler: 'custom',
          output: {
            type: 'static',
            lines: MOUNT_OUTPUT.split('\n'),
          },
        },

        ps: {
          description: 'Display process status',
          handler: 'custom',
          output: {
            type: 'static',
            lines: PS_OUTPUT.split('\n'),
          },
        },

        // ========================================
        // SHELL COMMANDS - Search
        // ========================================
        grep: {
          description: 'Search for patterns in files',
          handler: 'builtin',
          builtinType: 'grep',
          constraints: {
            arguments: {
              min: 1,
            },
          },
        },

        find: {
          description: 'Search for files',
          handler: 'builtin',
          builtinType: 'find',
        },

        // ========================================
        // LOGIN SEQUENCE
        // ========================================
        root: {
          description: 'Login as root',
          handler: 'custom',
          constraints: {
            state: {
              bootStage: 'login',
            },
          },
          output: {
            type: 'static',
            lines: [],
          },
          sideEffects: {
            setState: {
              bootStage: 'password',
              loginUser: 'root',
            },
          },
        },

        sohoadmin: {
          description: 'Enter password',
          handler: 'custom',
          constraints: {
            state: {
              bootStage: 'password',
            },
          },
          output: {
            type: 'static',
            lines: [
              '',
              'BusyBox v1.01 (2015.06.16-06:24+0000) Built-in shell (ash)',
              "Enter 'help' for a list of built-in commands.",
              '',
            ],
          },
          sideEffects: {
            unlockFlags: ['root'],
            setState: {
              bootStage: 'shell',
              currentPath: '/',
            },
          },
        },
      },

      environment: {
        USER: 'root',
        HOME: '/root',
        PATH: '/bin:/sbin:/usr/bin:/usr/sbin',
        SHELL: '/bin/sh',
      },
    },

    // ========================================
    // LOCAL TAB (Kali Linux)
    // ========================================
    {
      id: 'local',
      name: 'Local Machine',
      initialPath: '/home/kali',

      filesystem: {
        directories: LOCAL_FS_DIRS,
        files: LOCAL_FILE_CONTENTS,
        fileDefaults: { permissions: '-rw-r--r--', owner: 'kali' },
      },

      commands: {
        // ls, cd, pwd, cat, clear are in globalCommands

        // ========================================
        // CRACKING TOOLS
        // ========================================
        hashcat: {
          description: 'Advanced password recovery utility',
          handler: 'custom',
          usage: 'hashcat [options] <hash|hashfile> [dictionary|mask]',
          constraints: {
            arguments: {
              min: 1,
            },
          },
          output: {
            type: 'conditional',
            conditions: [
              {
                if: {
                  type: 'argument',
                  index: 0,
                  regex: '^\\$1\\$GTN\\.gpri\\$',
                },
                then: {
                  type: 'static',
                  lines: [
                    'hashcat (v6.2.5) starting...',
                    '',
                    'Dictionary cache built:',
                    '* Filename..: /usr/share/wordlists/rockyou.txt',
                    '* Passwords.: 14344384',
                    '* Bytes.....: 139921497',
                    '',
                    '$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:sohoadmin',
                    '',
                    'Session..........: hashcat',
                    'Status...........: Cracked',
                    'Hash.Mode........: 500 (md5crypt)',
                    'Hash.Target......: $1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/',
                    'Time.Started.....: 00:00:03',
                    'Speed.#1.........: 18247 H/s',
                    'Recovered........: 1/1 (100.00%) Digests',
                    'Progress.........: 3072/14344384 (0.02%)',
                  ],
                },
              },
            ],
            default: {
              type: 'static',
              lines: [
                'Usage: hashcat [options] <hash|hashfile> [dictionary|mask]',
                'Example: hashcat $1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/ /usr/share/wordlists/rockyou.txt',
              ],
            },
          },
          sideEffects: {
            unlockFlags: [
              {
                id: 'hash',
                condition: {
                  type: 'argument',
                  index: 0,
                  regex: '^\\$1\\$GTN\\.gpri\\$',
                },
              },
            ],
          },
        },

        john: {
          description: 'John the Ripper password cracker',
          handler: 'custom',
          usage: 'john [options] <hashfile>',
          constraints: {
            arguments: {
              min: 1,
            },
          },
          output: {
            type: 'conditional',
            conditions: [
              {
                if: {
                  type: 'argument',
                  index: 0,
                  contains: 'shadow',
                },
                then: {
                  type: 'static',
                  lines: [
                    'Loaded 1 password hash (md5crypt [MD5 32/64 X2])',
                    'Will run 4 OpenMP threads',
                    "Press 'q' or Ctrl-C to abort, almost any other key for status",
                    'sohoadmin        (root)',
                    '1g 0:00:00:02 DONE 2/3 (2015-06-16 14:30) 0.4000g/s 12000p/s',
                    'Session completed',
                  ],
                },
              },
            ],
            default: {
              type: 'static',
              lines: ['Usage: john [options] <hashfile>'],
            },
          },
          sideEffects: {
            unlockFlags: [
              {
                id: 'hash',
                condition: {
                  type: 'argument',
                  index: 0,
                  contains: 'shadow',
                },
              },
            ],
          },
        },

      },

      environment: {
        USER: 'kali',
        HOME: '/home/kali',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        SHELL: '/bin/bash',
      },
    },
  ],
};

export default terminalConfig;
