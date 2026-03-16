# Type System

Tipi TypeScript principali dell'applicazione, verificati rispetto al codice sorgente.

---

## Exercise Types (`src/data/exercise.ts`)

```typescript
export type ObjectiveType = 'component' | 'uart' | 'terminal' | 'pin' | 'firmware-dump';
export type Tool = 'pointer' | 'magnifier' | 'multimeter' | 'probes' | 'terminal' | 'custom';
export const ALL_TOOLS: Tool[] = ['pointer', 'magnifier', 'multimeter', 'probes', 'terminal'];

export type PinLogic = 'AND' | 'OR';

export interface ToolGroup {
  id: string;
  name: string;
  toolIds: string[];           // tool che possono coesistere nella sidebar
}

export interface Exercise {
  pcbImage: string;
  steps: Step[];
  components: HardwareComponent[];
  pins: MeasurementPin[];
  uartPins: UartPin[];
  initialFlag: string;
  customTools?: CustomTool[];
  firmwarePath?: string;       // percorso firmware caricato dall'autore
  toolGroups?: ToolGroup[];    // gruppi di tool attivabili contemporaneamente
}

export interface Step {
  id: string;
  title: string;
  description: string;
  objectives: Objective[];
  expectedFlag: string;
  availableTools?: Tool[];
}

export interface Objective {
  id: string;
  name: string;
  type?: ObjectiveType;      // default: 'component'
  componentId?: string;       // per type='component'
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number];
  pinConditions?: PinCondition[];
  pinLogic?: PinLogic;
  bootStageConditions?: BootStageCondition[];
  customToolId?: string;      // per type='firmware-dump'
  requiresUart?: boolean;     // per type='terminal': richiede collegamento UART per avviarsi
  terminalPersistent?: boolean; // per type='terminal': non disattivabile dalla toolbar
}

export interface HardwareComponent {
  id: string;
  name: string;
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number];
}

export interface MeasurementPin {
  id: string;
  valueV: number;
  valueOhm: number;
  coords: [number, number, number, number];
}

export interface UartPin {
  id: string;
  role: 'tx' | 'rx' | 'gnd' | 'vcc';
  label: string;
  coords: [number, number, number, number];
}

export interface PinCondition {
  pinId: string;
  terminal: string;  // 'probe1' | 'probe2' | 'adapter-tx' | 'adapter-rx' | 'adapter-gnd'
}

export interface BootStageCondition {
  bootStageId: string;
  unlockedFlags: string[];
  hint: string;
}
```

---

## Terminal Config Types (`src/types/terminal-config.ts`)

```typescript
export interface TerminalConfig {
  metadata?: { name?: string; description?: string; version?: string };
  tabs: TabConfig[];
  flags?: FlagSystem;
  globalCommands?: CommandDefinition[];
  customFunctions?: Record<string, string>;
}

export interface TabConfig {
  id: string;
  name: string;
  commands: CommandDefinition[];
  filesystem?: FilesystemStructure;
  bootSequence?: BootSequence;
  environment?: Record<string, string>;
  defaultConstraints?: CommandConstraints;
}

export interface CommandDefinition {
  name: string;
  handler: 'builtin' | 'custom' | 'dynamic' | 'script' | 'lookup';
  builtinType?: string;
  description?: string;
  constraints?: CommandConstraints;
  output?: CommandOutput;
  sideEffects?: CommandSideEffects;
}

// Output types (union discriminata)
export type CommandOutput =
  | StaticOutput
  | DynamicOutput
  | ConditionalOutput
  | TemplateOutput
  | LookupOutput
  | ScriptOutput;

export interface StaticOutput { type: 'static'; lines: string[] }
export interface DynamicOutput { type: 'dynamic'; generator: string; args?: any[] }
export interface ConditionalOutput {
  type: 'conditional';
  conditions: Array<{ if: ConditionCheck; then: CommandOutput; else?: CommandOutput }>;
  default?: CommandOutput;
}
export interface TemplateOutput {
  type: 'template';
  template: string;
  variables: Record<string, TemplateVariable>;
}
export interface LookupOutput {
  type: 'lookup';
  argIndex: number;
  matchType: 'contains' | 'equals' | 'regex';
  table: Record<string, string[]>;
  default?: CommandOutput;
}
export interface ScriptOutput { type: 'script'; script: string }

// Constraints (ciascuno e' un oggetto complesso, non una stringa)
export interface CommandConstraints {
  path?: PathConstraint;
  permissions?: PermissionConstraint;
  prerequisites?: PrerequisiteConstraint;
  arguments?: ArgumentConstraint;
  state?: StateConstraint;
}

export interface PathConstraint {
  type: 'exact' | 'contains' | 'startsWith' | 'regex';
  value: string | string[];
  errorMessage?: string;
}

export interface PermissionConstraint {
  requireRoot?: boolean;
  requireUser?: string;
  errorMessage?: string;
}

export interface PrerequisiteConstraint {
  commands?: string[];
  files?: string[];
  flags?: string[];
  condition?: 'all' | 'any';
  errorMessage?: string;
}

export interface ArgumentConstraint {
  min?: number;
  max?: number;
  required?: Array<{ index: number; pattern?: string; errorMessage?: string }>;
  errorMessage?: string;
}

export interface StateConstraint {
  bootStage?: string | string[];
  variables?: Record<string, any>;
  errorMessage?: string;
}

// Side effects
export interface CommandSideEffects {
  unlockFlags?: Array<string | FlagUnlock>;
  setState?: Record<string, any>;
  executeCommand?: string;
}

// Boot sequence
export interface BootSequence {
  stages: BootStage[];
}

export interface BootStage {
  id: string;
  lines: string[];
  delayMs?: number;
  isFinal?: boolean;
}

// Flag system
export interface FlagSystem {
  parts: FlagPart[];
  completeFlag: string;
  showProgress?: boolean;
  completionMessage?: string;
}

export interface FlagPart {
  id: string;
  part: string;
  description: string;
  hint: string;
}
```

---

## Custom Tool Types (`src/types/custom-tool.ts`)

```typescript
export type ProbeConnectivity = 'measurement' | 'uart' | 'all';
export type ToolOutputType = 'none' | 'numeric' | 'leds' | 'connection-status' | 'firmware-dump';

export interface CustomTool {
  id: string;
  name: string;
  description?: string;
  probes: ToolProbe[];
  outputType: ToolOutputType;
  outputUnit?: string;
  modes?: ToolMode[];
  firmwareDumpConfig?: FirmwareDumpConfig;
}

export interface ToolProbe {
  id: string;
  label: string;
  role: string;
  color: string;
  connectivity: ProbeConnectivity;
}

export interface ToolMode {
  id: string;
  name: string;
  shortName: string;
  unit: string;
}

export interface FirmwareDumpConfig {
  requiredConnections: FirmwareDumpPinMapping[];
  filePath?: string;
  fileName?: string;
  dumpDurationSec?: number;
}

export interface FirmwareDumpPinMapping {
  probeId: string;
  pinId: string;
}
```

---

## Preset Types (`src/types/preset.ts`)

```typescript
export interface Preset {
  id: string;
  name: string;
  description?: string;
  exercise: Exercise;
  terminalConfig: TerminalConfig;
  customTools?: CustomTool[];
  createdAt: string;
  updatedAt: string;
}
```
