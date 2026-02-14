// src/lib/terminal-config-loader.ts
/**
 * Configuration Loader
 * Loads and validates terminal configuration, provides access to commands and settings
 */

import type {
  TerminalConfig,
  TabConfig,
  CommandDefinition,
  BootSequence,
  BootStage,
  FlagSystem,
} from '@/types/terminal-config';

export class TerminalConfigLoader {
  private config: TerminalConfig;
  private tabsMap: Map<string, TabConfig> = new Map();
  private commandsCache: Map<string, Map<string, CommandDefinition>> = new Map();

  constructor(config: TerminalConfig) {
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize internal caches and maps
   */
  private initialize(): void {
    // Build tabs map
    for (const tab of this.config.tabs) {
      this.tabsMap.set(tab.id, tab);

      // Build commands map for this tab (including global commands)
      const commandsMap = new Map<string, CommandDefinition>();

      // Add global commands first
      if (this.config.globalCommands) {
        for (const [name, command] of Object.entries(this.config.globalCommands)) {
          commandsMap.set(name, command);
          // Add aliases
          if (command.aliases) {
            for (const alias of command.aliases) {
              commandsMap.set(alias, command);
            }
          }
        }
      }

      // Add tab-specific commands (override global if same name)
      if (tab.commands) {
        for (const [name, command] of Object.entries(tab.commands)) {
          commandsMap.set(name, command);
          // Add aliases
          if (command.aliases) {
            for (const alias of command.aliases) {
              commandsMap.set(alias, command);
            }
          }
        }
      }

      this.commandsCache.set(tab.id, commandsMap);
    }
  }

  /**
   * Get the full configuration
   */
  getConfig(): TerminalConfig {
    return this.config;
  }

  /**
   * Get configuration metadata
   */
  getMetadata() {
    return this.config.metadata;
  }

  /**
   * Get all tabs
   */
  getTabs(): TabConfig[] {
    return this.config.tabs;
  }

  /**
   * Get a specific tab by ID
   */
  getTab(tabId: string): TabConfig | undefined {
    return this.tabsMap.get(tabId);
  }

  /**
   * Get tab filesystem
   */
  getFilesystem(tabId: string) {
    const tab = this.tabsMap.get(tabId);
    return tab?.filesystem;
  }

  /**
   * Get tab initial path
   */
  getInitialPath(tabId: string): string {
    const tab = this.tabsMap.get(tabId);
    return tab?.initialPath || '/';
  }

  /**
   * Get tab environment variables
   */
  getEnvironment(tabId: string): Record<string, string> {
    const tab = this.tabsMap.get(tabId);
    return tab?.environment || {};
  }

  /**
   * Get boot sequence for a tab
   */
  getBootSequence(tabId: string): BootSequence | undefined {
    const tab = this.tabsMap.get(tabId);
    return tab?.bootSequence;
  }

  /**
   * Get a specific boot stage
   */
  getBootStage(tabId: string, stageId: string): BootStage | undefined {
    const bootSeq = this.getBootSequence(tabId);
    return bootSeq?.stages.find((s) => s.id === stageId);
  }

  /**
   * Get initial boot stage for a tab
   */
  getInitialBootStage(tabId: string): string | undefined {
    const bootSeq = this.getBootSequence(tabId);
    return bootSeq?.initialStage;
  }

  /**
   * Get next boot stage
   */
  getNextBootStage(tabId: string, currentStageId: string): string | undefined {
    const stage = this.getBootStage(tabId, currentStageId);
    return stage?.nextStage;
  }

  /**
   * Get command definition by name or alias
   */
  getCommand(tabId: string, commandName: string): CommandDefinition | undefined {
    const commandsMap = this.commandsCache.get(tabId);
    return commandsMap?.get(commandName);
  }

  /**
   * Get all commands for a tab
   */
  getAllCommands(tabId: string): CommandDefinition[] {
    const commandsMap = this.commandsCache.get(tabId);
    if (!commandsMap) return [];

    // Return unique commands (no duplicates from aliases)
    const uniqueCommands = new Map<string, CommandDefinition>();
    for (const [name, command] of commandsMap.entries()) {
      if (name === command.name) {
        uniqueCommands.set(name, command);
      }
    }

    return Array.from(uniqueCommands.values());
  }

  /**
   * Get commands available in a specific boot stage
   */
  getCommandsForStage(tabId: string, bootStage: string): CommandDefinition[] {
    const allCommands = this.getAllCommands(tabId);

    return allCommands.filter((cmd) => {
      // If command has no state constraint, it's available in all stages
      if (!cmd.constraints?.state?.bootStage) return true;

      const allowedStages = Array.isArray(cmd.constraints.state.bootStage)
        ? cmd.constraints.state.bootStage
        : [cmd.constraints.state.bootStage];

      return allowedStages.includes(bootStage);
    });
  }

  /**
   * Get flag system configuration
   */
  getFlagSystem(): FlagSystem | undefined {
    return this.config.flags;
  }

  /**
   * Get all flag parts
   */
  getFlagParts() {
    return this.config.flags?.parts || [];
  }

  /**
   * Get complete flag string
   */
  getCompleteFlag(): string {
    return this.config.flags?.completeFlag || '';
  }

  /**
   * Get flag part by ID
   */
  getFlagPart(flagId: string) {
    return this.config.flags?.parts.find((f) => f.id === flagId);
  }

  /**
   * Build current flag string based on discovered flags
   */
  buildCurrentFlag(discoveredFlags: string[]): string {
    const parts = this.getFlagParts();
    const flagParts = parts.map((fp) =>
      discoveredFlags.includes(fp.id) ? fp.part : '?'.repeat(fp.part.length)
    );
    return `flag{${flagParts.join('_')}}`;
  }

  /**
   * Check if all flags are discovered
   */
  areAllFlagsDiscovered(discoveredFlags: string[]): boolean {
    const parts = this.getFlagParts();
    return parts.length > 0 && parts.every((fp) => discoveredFlags.includes(fp.id));
  }

  /**
   * Get custom functions registry
   */
  getCustomFunctions(): Record<string, string> {
    return this.config.customFunctions || {};
  }

  /**
   * Validate configuration structure
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate metadata
    if (!this.config.metadata?.version) {
      errors.push('Configuration must have metadata.version');
    }
    if (!this.config.metadata?.name) {
      errors.push('Configuration must have metadata.name');
    }

    // Validate tabs
    if (!this.config.tabs || this.config.tabs.length === 0) {
      errors.push('Configuration must have at least one tab');
    }

    // Validate each tab
    for (const tab of this.config.tabs) {
      if (!tab.id) {
        errors.push('Each tab must have an id');
      }
      if (!tab.name) {
        errors.push(`Tab ${tab.id} must have a name`);
      }
      if (!tab.filesystem) {
        errors.push(`Tab ${tab.id} must have a filesystem`);
      }
      if (!tab.commands) {
        errors.push(`Tab ${tab.id} must have commands`);
      }

      // Validate boot sequence if present
      if (tab.bootSequence) {
        if (!tab.bootSequence.initialStage) {
          errors.push(`Tab ${tab.id} boot sequence must have initialStage`);
        }
        if (!tab.bootSequence.stages || tab.bootSequence.stages.length === 0) {
          errors.push(`Tab ${tab.id} boot sequence must have stages`);
        }

        // Validate stages
        const stageIds = new Set<string>();
        for (const stage of tab.bootSequence.stages || []) {
          if (!stage.id) {
            errors.push(`Tab ${tab.id} has a stage without id`);
          }
          if (stageIds.has(stage.id)) {
            errors.push(`Tab ${tab.id} has duplicate stage id: ${stage.id}`);
          }
          stageIds.add(stage.id);
        }

        // Validate initial stage exists
        if (
          tab.bootSequence.initialStage &&
          !stageIds.has(tab.bootSequence.initialStage)
        ) {
          errors.push(
            `Tab ${tab.id} initialStage "${tab.bootSequence.initialStage}" does not exist in stages`
          );
        }
      }

      // Validate commands
      if (tab.commands) {
        for (const [name, command] of Object.entries(tab.commands)) {
          if (!command.name) {
            errors.push(`Tab ${tab.id} command "${name}" must have a name`);
          }
          if (!command.handler) {
            errors.push(`Tab ${tab.id} command "${name}" must have a handler`);
          }
          if (command.handler === 'builtin' && !command.builtinType && !command.name) {
            errors.push(
              `Tab ${tab.id} builtin command "${name}" must have builtinType or name`
            );
          }
        }
      }
    }

    // Validate flags
    if (this.config.flags) {
      if (!this.config.flags.parts || this.config.flags.parts.length === 0) {
        errors.push('Flag system must have parts array');
      }
      if (!this.config.flags.completeFlag) {
        errors.push('Flag system must have completeFlag');
      }

      // Validate flag parts
      const flagIds = new Set<string>();
      for (const part of this.config.flags.parts || []) {
        if (!part.id) {
          errors.push('Each flag part must have an id');
        }
        if (flagIds.has(part.id)) {
          errors.push(`Duplicate flag id: ${part.id}`);
        }
        flagIds.add(part.id);

        if (!part.part) {
          errors.push(`Flag ${part.id} must have a part string`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration summary for debugging
   */
  getSummary(): string {
    const lines: string[] = [];

    lines.push(`Terminal Configuration: ${this.config.metadata.name}`);
    lines.push(`Version: ${this.config.metadata.version}`);
    lines.push(`\nTabs (${this.config.tabs.length}):`);

    for (const tab of this.config.tabs) {
      lines.push(`  - ${tab.id}: ${tab.name}`);
      const commandCount = this.getAllCommands(tab.id).length;
      lines.push(`    Commands: ${commandCount}`);

      if (tab.bootSequence) {
        lines.push(`    Boot Stages: ${tab.bootSequence.stages.length}`);
      }

      const dirCount = Object.keys(tab.filesystem.directories).length;
      const fileCount = Object.keys(tab.filesystem.files).length;
      lines.push(`    Filesystem: ${dirCount} directories, ${fileCount} files`);
    }

    if (this.config.flags) {
      lines.push(`\nFlags: ${this.config.flags.parts.length} parts`);
      lines.push(`Complete Flag: ${this.config.flags.completeFlag}`);
    }

    return lines.join('\n');
  }
}
