// src/lib/terminal-command-executor.ts
/**
 * Command Executor
 * Handles command execution based on configuration with validation and output generation
 * All methods are synchronous - no async operations needed for simulated terminal
 */

import type {
  CommandDefinition,
  CommandContext,
  CommandExecutionResult,
  CommandConstraints,
  CommandOutput,
  ConditionCheck,
  ConditionalOutput,
  TemplateOutput,
  LookupOutput,
} from '@/types/terminal-config';

export class CommandExecutor {
  private customFunctions: Map<string, Function> = new Map();
  private builtinHandlers: Map<string, Function> = new Map();

  constructor() {
    this.registerBuiltinHandlers();
  }

  registerCustomFunction(name: string, fn: Function): void {
    this.customFunctions.set(name, fn);
  }

  registerBuiltinHandler(type: string, handler: Function): void {
    this.builtinHandlers.set(type, handler);
  }

  /**
   * Execute a command with the given context (synchronous)
   */
  executeCommand(
    command: CommandDefinition,
    context: CommandContext
  ): CommandExecutionResult {
    // Step 1: Validate constraints
    const validation = this.validateConstraints(command.constraints, context);
    if (!validation.valid) {
      return {
        success: false,
        output: [],
        error: validation.error,
      };
    }

    // Step 2: Generate output based on handler type
    let output: string[] = [];

    try {
      switch (command.handler) {
        case 'builtin':
          output = this.executeBuiltinCommand(command, context);
          break;

        case 'custom':
          output = this.generateOutput(command.output, context);
          break;

        case 'dynamic':
          output = this.executeDynamicCommand(command, context);
          break;

        case 'script':
          output = this.executeScriptCommand(command, context);
          break;

        default:
          return {
            success: false,
            output: [],
            error: `Unknown handler type: ${command.handler}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        output: [],
        error: error.message || 'Command execution failed',
      };
    }

    // Step 3: Apply side effects
    const sideEffects = this.applySideEffects(command, context);

    return {
      success: true,
      output,
      sideEffects,
    };
  }

  // ============================================
  // CONSTRAINT VALIDATION
  // ============================================

  private validateConstraints(
    constraints: CommandConstraints | undefined,
    context: CommandContext
  ): { valid: boolean; error?: string } {
    if (!constraints) return { valid: true };

    if (constraints.path) {
      const pathCheck = this.validatePath(constraints.path, context);
      if (!pathCheck.valid) return pathCheck;
    }

    if (constraints.permissions) {
      const permCheck = this.validatePermissions(constraints.permissions, context);
      if (!permCheck.valid) return permCheck;
    }

    if (constraints.prerequisites) {
      const prereqCheck = this.validatePrerequisites(constraints.prerequisites, context);
      if (!prereqCheck.valid) return prereqCheck;
    }

    if (constraints.arguments) {
      const argCheck = this.validateArguments(constraints.arguments, context);
      if (!argCheck.valid) return argCheck;
    }

    if (constraints.state) {
      const stateCheck = this.validateState(constraints.state, context);
      if (!stateCheck.valid) return stateCheck;
    }

    return { valid: true };
  }

  private validatePath(
    constraint: any,
    context: CommandContext
  ): { valid: boolean; error?: string } {
    const { type, value, errorMessage } = constraint;
    const path = context.currentPath;
    let valid = false;

    switch (type) {
      case 'exact':
        valid = Array.isArray(value) ? value.includes(path) : path === value;
        break;
      case 'contains':
        valid = Array.isArray(value) ? value.some((v: string) => path.includes(v)) : path.includes(value);
        break;
      case 'startsWith':
        valid = Array.isArray(value) ? value.some((v: string) => path.startsWith(v)) : path.startsWith(value);
        break;
      case 'regex':
        valid = new RegExp(value).test(path);
        break;
    }

    return { valid, error: valid ? undefined : errorMessage || `Path constraint not met: ${path}` };
  }

  private validatePermissions(
    constraint: any,
    context: CommandContext
  ): { valid: boolean; error?: string } {
    const { requireRoot, requireUser, errorMessage } = constraint;

    if (requireRoot && context.environment.USER !== 'root') {
      return { valid: false, error: errorMessage || 'This command requires root privileges' };
    }
    if (requireUser && context.environment.USER !== requireUser) {
      return { valid: false, error: errorMessage || `This command requires user: ${requireUser}` };
    }
    return { valid: true };
  }

  private validatePrerequisites(
    constraint: any,
    context: CommandContext
  ): { valid: boolean; error?: string } {
    const { commands, files, flags, condition = 'all', errorMessage } = constraint;
    const checks: boolean[] = [];

    if (commands?.length > 0) {
      checks.push(...commands.map((cmd: string) => context.history.some((h) => h.startsWith(cmd))));
    }
    if (files?.length > 0) {
      checks.push(...files.map((file: string) => context.filesystem.files[file] !== undefined));
    }
    if (flags?.length > 0) {
      checks.push(...flags.map((flag: string) => context.discoveredFlags.includes(flag)));
    }

    const valid = condition === 'all' ? checks.every((c) => c) : checks.some((c) => c);
    return { valid, error: valid ? undefined : errorMessage || 'Prerequisites not met' };
  }

  private validateArguments(
    constraint: any,
    context: CommandContext
  ): { valid: boolean; error?: string } {
    const { min, max, required, errorMessage } = constraint;
    const argCount = context.args.length;

    if (min !== undefined && argCount < min) {
      return { valid: false, error: errorMessage || `Command requires at least ${min} argument(s)` };
    }
    if (max !== undefined && argCount > max) {
      return { valid: false, error: errorMessage || `Command accepts at most ${max} argument(s)` };
    }

    if (required?.length > 0) {
      for (const req of required) {
        const arg = context.args[req.index];
        if (!arg) {
          return { valid: false, error: req.errorMessage || `Argument ${req.index} is required` };
        }
        if (req.pattern && !new RegExp(req.pattern).test(arg)) {
          return { valid: false, error: req.errorMessage || `Argument ${req.index} does not match pattern` };
        }
      }
    }

    return { valid: true };
  }

  private validateState(
    constraint: any,
    context: CommandContext
  ): { valid: boolean; error?: string } {
    const { bootStage, variables, errorMessage } = constraint;

    if (bootStage) {
      const stages = Array.isArray(bootStage) ? bootStage : [bootStage];
      if (!stages.includes(context.bootStage)) {
        return { valid: false, error: errorMessage || `Command not available in current boot stage: ${context.bootStage}` };
      }
    }

    if (variables) {
      for (const [key, expectedValue] of Object.entries(variables)) {
        if (context.state[key] !== expectedValue) {
          return { valid: false, error: errorMessage || `State variable ${key} does not match expected value` };
        }
      }
    }

    return { valid: true };
  }

  // ============================================
  // COMMAND EXECUTION
  // ============================================

  private executeBuiltinCommand(command: CommandDefinition, context: CommandContext): string[] {
    const builtinType = command.builtinType || command.name || '';
    const handler = this.builtinHandlers.get(builtinType);

    if (!handler) {
      throw new Error(`Builtin handler not found: ${builtinType}`);
    }

    return handler(context);
  }

  private executeDynamicCommand(command: CommandDefinition, context: CommandContext): string[] {
    if (!command.output || command.output.type !== 'dynamic') {
      throw new Error('Dynamic command requires dynamic output definition');
    }

    const fn = this.customFunctions.get(command.output.generator);
    if (!fn) throw new Error(`Custom function not found: ${command.output.generator}`);

    return fn(context, ...(command.output.args || []));
  }

  private executeScriptCommand(command: CommandDefinition, context: CommandContext): string[] {
    if (!command.output || command.output.type !== 'script') {
      throw new Error('Script command requires script output definition');
    }

    const fn = this.customFunctions.get(command.output.script);
    if (!fn) throw new Error(`Script function not found: ${command.output.script}`);

    return fn(context);
  }

  // ============================================
  // OUTPUT GENERATION
  // ============================================

  private generateOutput(outputDef: CommandOutput | undefined, context: CommandContext): string[] {
    if (!outputDef) return [];

    switch (outputDef.type) {
      case 'static':
        return outputDef.lines;

      case 'conditional':
        return this.generateConditionalOutput(outputDef, context);

      case 'template':
        return this.generateTemplateOutput(outputDef, context);

      case 'dynamic': {
        const fn = this.customFunctions.get(outputDef.generator);
        if (!fn) throw new Error(`Custom function not found: ${outputDef.generator}`);
        return fn(context, ...(outputDef.args || []));
      }

      case 'script': {
        const scriptFn = this.customFunctions.get(outputDef.script);
        if (!scriptFn) throw new Error(`Script function not found: ${outputDef.script}`);
        return scriptFn(context);
      }

      case 'lookup':
        return this.generateLookupOutput(outputDef, context);

      default:
        return [];
    }
  }

  private generateLookupOutput(output: LookupOutput, context: CommandContext): string[] {
    const arg = context.args[output.argIndex || 0];
    if (!arg) {
      return output.default ? this.generateOutput(output.default, context) : [];
    }

    for (const [key, lines] of Object.entries(output.table)) {
      let matched = false;
      switch (output.matchType) {
        case 'equals':
          matched = arg === key;
          break;
        case 'contains':
          matched = arg.includes(key);
          break;
        case 'regex':
          matched = new RegExp(key).test(arg);
          break;
      }
      if (matched) return lines;
    }

    return output.default ? this.generateOutput(output.default, context) : [];
  }

  private generateConditionalOutput(output: ConditionalOutput, context: CommandContext): string[] {
    for (const condition of output.conditions) {
      if (this.checkCondition(condition.if, context)) {
        return this.generateOutput(condition.then, context);
      } else if (condition.else) {
        return this.generateOutput(condition.else, context);
      }
    }

    if (output.default) {
      return this.generateOutput(output.default, context);
    }

    return [];
  }

  private checkCondition(condition: ConditionCheck, context: CommandContext): boolean {
    switch (condition.type) {
      case 'argument': {
        const arg = context.args[condition.index || 0];
        if (!arg) return false;
        if (condition.equals !== undefined) return arg === condition.equals;
        if (condition.contains !== undefined) return arg.includes(condition.contains);
        if (condition.regex !== undefined) return new RegExp(condition.regex).test(arg);
        return true;
      }

      case 'path':
        if (condition.equals !== undefined) return context.currentPath === condition.equals;
        if (condition.contains !== undefined) return context.currentPath.includes(condition.contains);
        return false;

      case 'file':
        if (condition.value && typeof condition.value === 'string') {
          return context.filesystem.files[condition.value] !== undefined;
        }
        return false;

      case 'flag':
        if (condition.value && typeof condition.value === 'string') {
          return context.discoveredFlags.includes(condition.value);
        }
        return false;

      case 'state':
        if (condition.variable && condition.value !== undefined) {
          return context.state[condition.variable] === condition.value;
        }
        return false;

      case 'custom':
        if (condition.check) {
          const fn = this.customFunctions.get(condition.check);
          if (fn) return fn(context);
        }
        return false;

      default:
        return false;
    }
  }

  private generateTemplateOutput(output: TemplateOutput, context: CommandContext): string[] {
    let result = output.template;

    for (const [key, varDef] of Object.entries(output.variables)) {
      let value: any;

      switch (varDef.type) {
        case 'static':
          value = varDef.value;
          break;
        case 'computed':
          if (varDef.compute) {
            const fn = this.customFunctions.get(varDef.compute);
            value = fn ? fn(context) : '';
          }
          break;
        case 'random':
          if (varDef.min !== undefined && varDef.max !== undefined) {
            value = Math.floor(Math.random() * (varDef.max - varDef.min + 1)) + varDef.min;
          } else if (varDef.options?.length) {
            value = varDef.options[Math.floor(Math.random() * varDef.options.length)];
          }
          break;
        case 'state':
          if (varDef.value && typeof varDef.value === 'string') {
            value = context.state[varDef.value];
          }
          break;
      }

      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value || ''));
    }

    return result.split('\n');
  }

  // ============================================
  // SIDE EFFECTS
  // ============================================

  private applySideEffects(command: CommandDefinition, context: CommandContext): any {
    if (!command.sideEffects) return {};

    const result: any = {};

    // Unlock flags
    if (command.sideEffects.unlockFlags) {
      const newFlags: string[] = [];

      for (const flagDef of command.sideEffects.unlockFlags) {
        if (typeof flagDef === 'string') {
          if (!context.discoveredFlags.includes(flagDef)) {
            newFlags.push(flagDef);
          }
        } else {
          const shouldUnlock = flagDef.condition
            ? this.checkCondition(flagDef.condition, context)
            : true;

          if (shouldUnlock && !context.discoveredFlags.includes(flagDef.id)) {
            newFlags.push(flagDef.id);
          }
        }
      }

      if (newFlags.length > 0) {
        result.newFlags = newFlags;
      }
    }

    // Set state changes
    if (command.sideEffects.setState) {
      result.stateChanges = command.sideEffects.setState;
    }

    // Execute custom effect
    if (command.sideEffects.customEffect) {
      const fn = this.customFunctions.get(command.sideEffects.customEffect);
      if (fn) fn(context, result);
    }

    return result;
  }

  private registerBuiltinHandlers(): void {
    // Default handlers - will be overridden by registerBuiltinHandlers()
    this.builtinHandlers.set('help', () => ['Help text will be generated by Terminal component']);
    this.builtinHandlers.set('clear', () => ['__CLEAR__']);
  }
}
