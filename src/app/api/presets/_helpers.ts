// src/app/api/presets/_helpers.ts

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import path from 'path';
import type { PresetListItem } from '@/types/preset';

const PRESETS_DIR = path.join(process.cwd(), 'src/data/presets');
const INDEX_FILE = path.join(PRESETS_DIR, 'index.json');

/** Ensure the presets directory and index.json exist. */
export async function ensurePresetsDir(): Promise<void> {
  try {
    await access(PRESETS_DIR);
  } catch {
    await mkdir(PRESETS_DIR, { recursive: true });
  }
  try {
    await access(INDEX_FILE);
  } catch {
    await writeFile(INDEX_FILE, '[]', 'utf-8');
  }
}

/** Read the preset index (manifest). */
export async function readIndex(): Promise<PresetListItem[]> {
  await ensurePresetsDir();
  const data = await readFile(INDEX_FILE, 'utf-8');
  return JSON.parse(data) as PresetListItem[];
}

/** Write the preset index (manifest). */
export async function writeIndex(items: PresetListItem[]): Promise<void> {
  await ensurePresetsDir();
  await writeFile(INDEX_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

/** Get the file path for a preset by id. */
export function getPresetPath(id: string): string {
  return path.join(PRESETS_DIR, `${id}.json`);
}

/** Generate a slug-safe preset id from a name. */
export function generatePresetId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
  const hash = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  return `${slug || 'preset'}-${hash}`;
}
