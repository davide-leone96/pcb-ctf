// src/types/terminal-config.ts
/**
 * Terminal Configuration System
 * Defines the structure for customizable terminal behavior via configuration files
 */

// ============================================
// CONSTRAINT TYPES
// ============================================

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
  required?: Array<{
    index: number;
    pattern?: string;
    errorMessage?: string;
  }>;
  errorMessage?: string;
}

export interface StateConstraint {
  bootStage?: string | string[];
  variables?: Record<string, any>;
  errorMessage?: string;
}

export interface CommandConstraints {
  path?: PathConstraint;
  permissions?: PermissionConstraint;
  prerequisites?: PrerequisiteConstraint;
  arguments?: ArgumentConstraint;
  state?: StateConstraint;
}

// ============================================
// OUTPUT TYPES
// ============================================

export interface StaticOutput {
  type: 'static';
  lines: string[];
}

export interface DynamicOutput {
  type: 'dynamic';
  generator: string; // Function name to call
  args?: any[];
}

export interface ConditionalOutput {
  type: 'conditional';
  conditions: Array<{
    if: ConditionCheck;
    then: CommandOutput;
    else?: CommandOutput;
  }>;
  default?: CommandOutput;
}

export interface TemplateOutput {
  type: 'template';
  template: string;
  variables: Record<string, TemplateVariable>;
}

export interface ScriptOutput {
  type: 'script';
  script: string; // Function name or inline script
}

export interface LookupOutput {
  type: 'lookup';
  /** Which argument to match against (0-based index) */
  argIndex: number;
  /** Match strategy: 'contains' checks substring, 'equals' checks exact match */
  matchType: 'contains' | 'equals' | 'regex';
  /** Map of match values to their output lines */
  table: Record<string, string[]>;
  /** Fallback output if no match found */
  default?: CommandOutput;
}

export type CommandOutput =
  | StaticOutput
  | DynamicOutput
  | ConditionalOutput
  | TemplateOutput
  | ScriptOutput
  | LookupOutput;

// ============================================
// CONDITION TYPES
// ============================================

export interface ConditionCheck {
  type: 'argument' | 'path' | 'file' | 'flag' | 'state' | 'custom';
  index?: number; // For argument type
  contains?: string;
  equals?: string;
  regex?: string;
  exists?: boolean; // For file type
  value?: any; // For state type
  variable?: string; // For state type
  check?: string; // For custom type (function name)
}

export interface TemplateVariable {
  type: 'static' | 'computed' | 'random' | 'state';
  value?: any;
  min?: number;
  max?: number;
  options?: string[];
  compute?: string; // Function name
}

// ============================================
// SIDE EFFECTS
// ============================================

export interface FlagUnlock {
  id: string;
  condition?: ConditionCheck;
}

export interface CommandSideEffects {
  unlockFlags?: Array<string | FlagUnlock>;
  setState?: Record<string, any>;
  executeCommand?: string;
  customEffect?: string; // Function name
}

// ============================================
// COMMAND DEFINITION
// ============================================

export interface CommandDefinition {
  /** Command name (optional — derived from the key in the commands record if omitted) */
  name?: string;
  aliases?: string[];
  description: string;
  usage?: string;
  handler: 'builtin' | 'custom' | 'script' | 'dynamic';
  builtinType?: string; // For builtin commands (ls, cat, cd, etc.)
  constraints?: CommandConstraints;
  output?: CommandOutput;
  sideEffects?: CommandSideEffects;
  help?: string;
}

// ============================================
// FILESYSTEM STRUCTURE
// ============================================

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string; // For files
  permissions?: string;
  owner?: string;
  size?: number;
  modified?: string;
  metadata?: Record<string, any>;
}

export interface FileDefaults {
  permissions?: string;
  owner?: string;
}

/** Nested tree: string = file content, object = directory (including {} for empty dirs) */
export interface FilesystemTree {
  [name: string]: string | FilesystemTree;
}

export interface FilesystemStructure {
  /** Nested tree format (input only — flattened by config loader at load time) */
  tree?: FilesystemTree;
  directories: Record<string, string[]>; // path -> array of entries
  files: Record<string, FileNode | string>; // full path -> file data or content string (shorthand)
  fileDefaults?: FileDefaults; // defaults for owner/permissions
}

// ============================================
// FLAG SYSTEM
// ============================================

export interface FlagPart {
  id: string;
  part: string;
  description: string;
  hint: string;
}

export interface FlagSystem {
  parts: FlagPart[];
  completeFlag: string;
  showProgress?: boolean;
  completionMessage?: string;
}

// ============================================
// BOOT SEQUENCE
// ============================================

export interface BootStage {
  id: string;
  name: string;
  lines: string[];
  duration?: number; // ms
  nextStage?: string;
  prompt?: string;
  /** Auto-progress to nextStage after this many ms of inactivity.
   *  Any user input cancels the timer. */
  autoProgressTimeout?: number;
}

export interface BootSequence {
  stages: BootStage[];
  initialStage: string;
}

// ============================================
// TAB CONFIGURATION
// ============================================

export interface TabConfig {
  id: string;
  name: string;
  filesystem: FilesystemStructure;
  commands: Record<string, CommandDefinition>;
  bootSequence?: BootSequence;
  initialPath?: string;
  environment?: Record<string, string>;
  /** Default constraints applied to all commands in this tab (command-level overrides take precedence) */
  defaultConstraints?: CommandConstraints;
}

// ============================================
// MAIN CONFIGURATION
// ============================================

export interface TerminalConfig {
  metadata: {
    version: string;
    name: string;
    description: string;
    author?: string;
  };
  tabs: TabConfig[];
  flags?: FlagSystem;
  globalCommands?: Record<string, CommandDefinition>; // Available in all tabs
  customFunctions?: Record<string, string>; // Custom JS functions
}

// ============================================
// COMMAND EXECUTION CONTEXT
// ============================================

export interface CommandContext {
  command: string;
  args: string[];
  currentPath: string;
  filesystem: FilesystemStructure;
  environment: Record<string, string>;
  bootStage: string;
  discoveredFlags: string[];
  history: string[];
  state: Record<string, any>;
  tab: string;
}

// ============================================
// COMMAND EXECUTION RESULT
// ============================================

export interface CommandExecutionResult {
  success: boolean;
  output: string[];
  error?: string;
  sideEffects?: {
    newFlags?: string[];
    stateChanges?: Record<string, any>;
    stageChange?: string;
    pathChange?: string;
  };
}
