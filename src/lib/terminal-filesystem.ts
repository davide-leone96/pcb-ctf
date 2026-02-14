// src/lib/terminal-filesystem.ts
/**
 * Filesystem Utilities
 * Provides path resolution, navigation, and file operations for the terminal
 */

import type { FilesystemStructure, FileNode } from '@/types/terminal-config';

/**
 * Resolve a relative or absolute path to an absolute path
 */
export function resolvePath(inputPath: string, currentPath: string): string {
  // Handle empty input
  if (!inputPath || inputPath === '.') {
    return currentPath;
  }

  // Handle home directory
  if (inputPath === '~' || inputPath.startsWith('~/')) {
    inputPath = inputPath.replace(/^~/, '/root');
  }

  // Start from current or root
  const startPath = inputPath.startsWith('/') ? '/' : currentPath;

  // Split and clean path parts
  const pathParts = inputPath.split('/').filter((p) => p && p !== '.');

  // Build path array starting from current location
  const absoluteParts = startPath === '/' ? [] : startPath.split('/').filter((p) => p);

  // Process each part
  for (const part of pathParts) {
    if (part === '..') {
      // Go up one directory
      if (absoluteParts.length > 0) {
        absoluteParts.pop();
      }
    } else {
      // Add directory
      absoluteParts.push(part);
    }
  }

  // Return absolute path
  return '/' + absoluteParts.join('/').replace(/\/+/g, '/');
}

/**
 * Check if a path exists in the filesystem
 */
export function pathExists(path: string, filesystem: FilesystemStructure): boolean {
  // Check if it's a directory
  if (filesystem.directories[path] !== undefined) {
    return true;
  }

  // Check if it's a file
  if (filesystem.files[path] !== undefined) {
    return true;
  }

  return false;
}

/**
 * Check if a path is a directory
 */
export function isDirectory(path: string, filesystem: FilesystemStructure): boolean {
  return filesystem.directories[path] !== undefined;
}

/**
 * Check if a path is a file
 */
export function isFile(path: string, filesystem: FilesystemStructure): boolean {
  return filesystem.files[path] !== undefined;
}

/**
 * Compute directory entries by scanning directory and file keys.
 * Removes the need to manually specify entries for each directory.
 */
export function computeDirectoryEntries(
  path: string,
  filesystem: FilesystemStructure
): string[] {
  const normalizedPath = path === '/' ? '' : path;
  const entries = new Set<string>();

  // Scan subdirectories
  for (const dirPath of Object.keys(filesystem.directories)) {
    if (dirPath === path) continue; // skip self
    const parent = dirPath.substring(0, dirPath.lastIndexOf('/')) || '/';
    if (parent === path || (path === '/' && parent === '')) {
      const childName = dirPath.substring(normalizedPath.length + 1);
      // Only direct children (no '/' in the remaining name)
      if (childName && !childName.includes('/')) {
        entries.add(childName);
      }
    }
  }

  // Scan files
  for (const filePath of Object.keys(filesystem.files)) {
    const parent = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    if (parent === path || (path === '/' && parent === '')) {
      const childName = filePath.substring(normalizedPath.length + 1);
      if (childName && !childName.includes('/')) {
        entries.add(childName);
      }
    }
  }

  return Array.from(entries).sort();
}

/**
 * Get directory entries (files and subdirectories).
 * Returns the union of:
 * - Stored entries (from directories[path] array) - includes virtual entries
 * - Auto-computed entries (from directory/file keys) - ensures real children appear
 * This eliminates redundancy while preserving virtual entries (e.g. /bin/busybox).
 */
export function getDirectoryEntries(
  path: string,
  filesystem: FilesystemStructure
): string[] {
  const stored = filesystem.directories[path];
  if (stored === undefined) return [];

  const computed = computeDirectoryEntries(path, filesystem);
  const merged = new Set([...stored, ...computed]);
  return Array.from(merged).sort();
}

/**
 * Get file content
 */
export function getFileContent(path: string, filesystem: FilesystemStructure): string | null {
  const file = filesystem.files[path];
  return file ? file.content || '' : null;
}

/**
 * Get file node with metadata
 */
export function getFileNode(path: string, filesystem: FilesystemStructure): FileNode | null {
  return filesystem.files[path] || null;
}

/**
 * List directory contents with details (for ls -l)
 */
export function listDirectory(
  path: string,
  filesystem: FilesystemStructure,
  options: {
    long?: boolean;
    all?: boolean;
    human?: boolean;
  } = {}
): string[] {
  const entries = getDirectoryEntries(path, filesystem);

  if (!entries) {
    return [`ls: cannot access '${path}': No such file or directory`];
  }

  const result: string[] = [];

  // Add special entries for -a option
  const allEntries = options.all ? ['.', '..', ...entries] : entries;

  if (options.long) {
    // Long format: permissions owner group size date name
    for (const entry of allEntries) {
      if (entry === '.' || entry === '..') {
        result.push(`drwxr-xr-x 1 root root 0 Jan  1 00:00 ${entry}`);
        continue;
      }

      const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
      const isDir = isDirectory(fullPath, filesystem);
      const file = getFileNode(fullPath, filesystem);

      if (isDir) {
        result.push(`drwxr-xr-x 1 root root         0 Jan  1 00:00 ${entry}`);
      } else if (file) {
        const size = file.size || file.content?.length || 0;
        const perms = file.permissions || '-rw-r--r--';
        const owner = file.owner || 'root';
        const modified = file.modified || 'Jan  1 00:00';
        result.push(`${perms} 1 ${owner} ${owner} ${size.toString().padStart(9)} ${modified} ${entry}`);
      } else {
        result.push(`-rw-r--r-- 1 root root         0 Jan  1 00:00 ${entry}`);
      }
    }
  } else {
    // Simple format: just names
    result.push(allEntries.join('  '));
  }

  return result;
}

/**
 * Find files matching a pattern (for find command)
 */
export function findFiles(
  startPath: string,
  pattern: string,
  filesystem: FilesystemStructure,
  options: {
    type?: 'f' | 'd'; // file or directory
    name?: string;
    maxDepth?: number;
  } = {}
): string[] {
  const results: string[] = [];
  const visited = new Set<string>();

  function search(path: string, depth: number) {
    if (visited.has(path)) return;
    visited.add(path);

    if (options.maxDepth !== undefined && depth > options.maxDepth) {
      return;
    }

    // Check current path
    const isDir = isDirectory(path, filesystem);
    const isFileCheck = isFile(path, filesystem);

    // Match based on type filter
    let matches = false;
    if (!options.type) {
      matches = true;
    } else if (options.type === 'd' && isDir) {
      matches = true;
    } else if (options.type === 'f' && isFileCheck) {
      matches = true;
    }

    // Match based on name pattern
    if (matches && options.name) {
      const fileName = path.split('/').pop() || '';
      const regex = new RegExp(
        options.name.replace(/\*/g, '.*').replace(/\?/g, '.')
      );
      matches = regex.test(fileName);
    }

    if (matches) {
      results.push(path);
    }

    // Recurse into subdirectories
    if (isDir) {
      const entries = getDirectoryEntries(path, filesystem);
      for (const entry of entries) {
        const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
        search(fullPath, depth + 1);
      }
    }
  }

  search(startPath, 0);
  return results;
}

/**
 * Search for pattern in file contents (for grep command)
 */
export function grepFiles(
  pattern: string,
  paths: string[],
  filesystem: FilesystemStructure,
  options: {
    ignoreCase?: boolean;
    lineNumber?: boolean;
    recursive?: boolean;
  } = {}
): string[] {
  const results: string[] = [];
  const flags = options.ignoreCase ? 'gi' : 'g';
  const regex = new RegExp(pattern, flags);

  for (const path of paths) {
    const content = getFileContent(path, filesystem);
    if (!content) continue;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        if (options.lineNumber) {
          results.push(`${path}:${index + 1}:${line}`);
        } else if (paths.length > 1) {
          results.push(`${path}:${line}`);
        } else {
          results.push(line);
        }
      }
    });
  }

  return results;
}

/**
 * Get parent directory path
 */
export function getParentPath(path: string): string {
  if (path === '/') return '/';

  const parts = path.split('/').filter((p) => p);
  parts.pop();

  return parts.length === 0 ? '/' : '/' + parts.join('/');
}

/**
 * Get file/directory name from path
 */
export function getBasename(path: string): string {
  if (path === '/') return '/';

  const parts = path.split('/').filter((p) => p);
  return parts[parts.length - 1] || '/';
}

/**
 * Normalize path (remove redundant slashes, resolve . and ..)
 */
export function normalizePath(path: string): string {
  const parts = path.split('/').filter((p) => p && p !== '.');
  const normalized: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      if (normalized.length > 0) {
        normalized.pop();
      }
    } else {
      normalized.push(part);
    }
  }

  return normalized.length === 0 ? '/' : '/' + normalized.join('/');
}

/**
 * Join path parts
 */
export function joinPath(...parts: string[]): string {
  const joined = parts.join('/').replace(/\/+/g, '/');
  return normalizePath(joined);
}

/**
 * Check if a path is a valid absolute path
 */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/');
}

/**
 * Convert filesystem structure to a tree representation (for debugging)
 */
export function filesystemToTree(filesystem: FilesystemStructure): string {
  const lines: string[] = [];

  function traverse(path: string, prefix: string = '', isLast: boolean = true) {
    const name = getBasename(path);
    const connector = isLast ? '└── ' : '├── ';
    lines.push(prefix + connector + name);

    if (isDirectory(path, filesystem)) {
      const entries = getDirectoryEntries(path, filesystem);
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      entries.forEach((entry, index) => {
        const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
        const isLastEntry = index === entries.length - 1;
        traverse(fullPath, newPrefix, isLastEntry);
      });
    }
  }

  traverse('/');
  return lines.join('\n');
}
