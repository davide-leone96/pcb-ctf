// src/lib/terminal-builtin-handlers.ts
/**
 * Builtin Command Handlers
 * Implementation of standard shell commands (ls, cd, cat, pwd, etc.)
 */

import type { CommandContext } from '@/types/terminal-config';
import {
  resolvePath,
  pathExists,
  isDirectory,
  isFile,
  getFileContent,
  listDirectory,
  findFiles,
  grepFiles,
  getFileNode,
} from './terminal-filesystem';

/**
 * Register all builtin handlers with the CommandExecutor
 */
export function registerBuiltinHandlers(executor: any): void {
  // File operations
  executor.registerBuiltinHandler('ls', handleLs);
  executor.registerBuiltinHandler('cd', handleCd);
  executor.registerBuiltinHandler('pwd', handlePwd);
  executor.registerBuiltinHandler('cat', handleCat);

  // Search operations
  executor.registerBuiltinHandler('grep', handleGrep);
  executor.registerBuiltinHandler('find', handleFind);

  // Special
  executor.registerBuiltinHandler('clear', handleClear);
}

/**
 * List directory contents
 */
function handleLs(context: CommandContext): string[] {
  const args = context.args;
  const hasLongFlag = args.includes('-l') || args.includes('-la') || args.includes('-al');
  const hasAllFlag = args.includes('-a') || args.includes('-la') || args.includes('-al');

  // Get target path
  const targetArg = args.find(arg => !arg.startsWith('-')) || context.currentPath;
  const targetPath = resolvePath(targetArg, context.currentPath);

  // Check if path exists
  if (!pathExists(targetPath, context.filesystem)) {
    return [`ls: cannot access '${targetArg}': No such file or directory`];
  }

  // If it's a file, just show the file
  if (isFile(targetPath, context.filesystem)) {
    return [targetArg];
  }

  // List directory
  return listDirectory(targetPath, context.filesystem, {
    long: hasLongFlag,
    all: hasAllFlag,
  });
}

/**
 * Change directory
 */
function handleCd(context: CommandContext): string[] {
  // cd is special - it doesn't return output, it changes state
  // The state change will be handled by side effects
  const target = context.args[0] || '/root';
  const targetPath = resolvePath(target, context.currentPath);

  if (!pathExists(targetPath, context.filesystem)) {
    return [`cd: ${target}: No such file or directory`];
  }

  if (!isDirectory(targetPath, context.filesystem)) {
    return [`cd: ${target}: Not a directory`];
  }

  // Success - path change will be handled by Terminal component
  return [];
}

/**
 * Print working directory
 */
function handlePwd(context: CommandContext): string[] {
  return [context.currentPath];
}

/**
 * Concatenate and display file contents
 */
function handleCat(context: CommandContext): string[] {
  const results: string[] = [];

  for (const arg of context.args) {
    const targetPath = resolvePath(arg, context.currentPath);

    if (!pathExists(targetPath, context.filesystem)) {
      results.push(`cat: ${arg}: No such file or directory`);
      continue;
    }

    if (isDirectory(targetPath, context.filesystem)) {
      results.push(`cat: ${arg}: Is a directory`);
      continue;
    }

    const content = getFileContent(targetPath, context.filesystem);
    if (content !== null) {
      results.push(content);
    } else {
      results.push(`cat: ${arg}: Permission denied`);
    }
  }

  return results;
}

/**
 * Search for patterns in files
 */
function handleGrep(context: CommandContext): string[] {
  if (context.args.length < 2) {
    return ['Usage: grep [options] pattern [file...]'];
  }

  const pattern = context.args[0];
  const files = context.args.slice(1);

  const resolvedPaths = files.map(f => resolvePath(f, context.currentPath));

  try {
    return grepFiles(pattern, resolvedPaths, context.filesystem, {
      ignoreCase: false,
      lineNumber: false,
    });
  } catch (error: any) {
    return [`grep: ${error.message}`];
  }
}

/**
 * Search for files
 */
function handleFind(context: CommandContext): string[] {
  const startPath = context.args[0]
    ? resolvePath(context.args[0], context.currentPath)
    : context.currentPath;

  if (!pathExists(startPath, context.filesystem)) {
    return [`find: '${context.args[0]}': No such file or directory`];
  }

  // Parse options
  let namePattern: string | undefined;
  let typeFilter: 'f' | 'd' | undefined;

  for (let i = 1; i < context.args.length; i++) {
    if (context.args[i] === '-name' && context.args[i + 1]) {
      namePattern = context.args[i + 1];
      i++;
    } else if (context.args[i] === '-type' && context.args[i + 1]) {
      typeFilter = context.args[i + 1] as 'f' | 'd';
      i++;
    }
  }

  return findFiles(startPath, '', context.filesystem, {
    name: namePattern,
    type: typeFilter,
  });
}

/**
 * Clear screen (special command)
 */
function handleClear(context: CommandContext): string[] {
  // Return empty array - Terminal component will handle clearing
  return ['__CLEAR__']; // Special marker
}

/**
 * Custom function: Get file type dynamically
 * Used as fallback when no lookup table entry matches.
 * All known file types should be in the command's lookup table in the config.
 */
export function getFileType(context: CommandContext): string[] {
  if (context.args.length === 0) {
    return ['file: missing operand'];
  }

  const targetPath = resolvePath(context.args[0], context.currentPath);

  if (!pathExists(targetPath, context.filesystem)) {
    return [`${context.args[0]}: cannot open (No such file or directory)`];
  }

  if (isDirectory(targetPath, context.filesystem)) {
    return [`${context.args[0]}: directory`];
  }

  // Content-based type detection
  const node = getFileNode(targetPath, context.filesystem);
  if (node?.content) {
    if (node.content.includes('#!/bin/sh') || node.content.includes('#!/bin/bash')) {
      return [`${context.args[0]}: Bourne-Again shell script, ASCII text executable`];
    }
    return [`${context.args[0]}: ASCII text`];
  }

  return [`${context.args[0]}: data`];
}

/**
 * Custom function: Get strings output dynamically
 * Used as fallback when no lookup table entry matches.
 * All known strings outputs should be in the command's lookup table in the config.
 */
export function getStringsOutput(context: CommandContext): string[] {
  if (context.args.length === 0) {
    return ['strings: missing operand'];
  }

  const targetPath = resolvePath(context.args[0], context.currentPath);

  // Try to extract printable strings from file content
  const content = getFileContent(targetPath, context.filesystem);
  if (content) {
    return content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 20);
  }

  return [`strings: '${context.args[0]}': No such file`];
}
