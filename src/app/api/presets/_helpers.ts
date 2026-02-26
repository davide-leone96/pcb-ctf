// src/app/api/presets/_helpers.ts

import { readFile, writeFile, mkdir, access, copyFile, unlink } from 'fs/promises';
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

// Images shipped with the project that must never be copied or deleted.
const PROTECTED_IMAGES = new Set([
  '/images/pcb.jpg', '/images/pcb_v1.png', '/images/pcb_v2.jpg',
  '/images/pcb_v3.png', '/images/pcb_v4.png',
]);

/** Returns true if the path belongs to a preset-owned image (preset-{id}.*). */
export function isPresetOwnedImage(imagePath: string): boolean {
  return /\/images\/preset-[^/]+\.[^/]+$/.test(imagePath);
}

/**
 * Copy a working image to a preset-specific file (`public/images/preset-{id}.{ext}`).
 * Returns the new public path (e.g. `/images/preset-abc123.png`), or null if nothing
 * was copied (protected image, empty path, or the image is already the correct preset file).
 */
export async function copyImageForPreset(
  srcImagePath: string,
  presetId: string,
): Promise<string | null> {
  if (!srcImagePath || PROTECTED_IMAGES.has(srcImagePath)) return null;

  const ext = path.extname(srcImagePath); // e.g. ".png"
  const presetImageName = `preset-${presetId}${ext}`;
  const expectedPath = `/images/${presetImageName}`;

  // Already the correct preset file — nothing to do.
  if (srcImagePath === expectedPath) return null;

  const srcAbs = path.join(process.cwd(), 'public', srcImagePath);
  const dstAbs = path.join(process.cwd(), 'public/images', presetImageName);
  await copyFile(srcAbs, dstAbs);
  return expectedPath;
}

/**
 * Delete a preset-owned image file if it exists.
 * Silently ignores missing files or non-preset-owned paths.
 */
export async function deletePresetImage(imagePath: string): Promise<void> {
  if (!isPresetOwnedImage(imagePath)) return;
  const absPath = path.join(process.cwd(), 'public', imagePath);
  await unlink(absPath).catch(() => {});
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
