// src/app/api/presets/[id]/route.ts

import { readFile, writeFile, unlink } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import type { Preset } from '@/types/preset';
import {
  readIndex, writeIndex, getPresetPath,
  copyImageForPreset, deletePresetImage,
} from '../_helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/presets/[id] — Load a specific preset */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const filePath = getPresetPath(id);
    const data = await readFile(filePath, 'utf-8');
    return NextResponse.json({ success: true, data: JSON.parse(data) });
  } catch (error: any) {
    const status = error.code === 'ENOENT' ? 404 : 500;
    return NextResponse.json(
      { success: false, error: error.code === 'ENOENT' ? 'Preset non trovato' : error.message },
      { status },
    );
  }
}

/** PUT /api/presets/[id] — Update an existing preset */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const preset: Preset = await request.json();

    preset.metadata.id = id;
    preset.metadata.updatedAt = new Date().toISOString();

    // Read existing preset to know the current preset-owned image path.
    let oldPresetImage: string | null = null;
    try {
      const existing: Preset = JSON.parse(await readFile(getPresetPath(id), 'utf-8'));
      oldPresetImage = existing.exerciseConfig?.pcbImage ?? null;
    } catch { /* preset might not exist yet */ }

    // Copy the working image to a preset-owned file if it changed.
    const srcImage = preset.exerciseConfig?.pcbImage;
    if (srcImage) {
      const newImagePath = await copyImageForPreset(srcImage, id);
      if (newImagePath) {
        // Delete the OLD preset image only if it differs (e.g. extension changed).
        if (oldPresetImage && oldPresetImage !== newImagePath) {
          await deletePresetImage(oldPresetImage);
        }
        preset.exerciseConfig.pcbImage = newImagePath;
      }
    }

    // Overwrite preset file
    const filePath = getPresetPath(id);
    await writeFile(filePath, JSON.stringify(preset, null, 2), 'utf-8');

    // Update index entry
    const items = await readIndex();
    const idx = items.findIndex(item => item.id === id);
    if (idx >= 0) {
      items[idx] = {
        id,
        name: preset.metadata.name,
        description: preset.metadata.description,
        createdAt: items[idx].createdAt,
        updatedAt: preset.metadata.updatedAt,
      };
    }
    await writeIndex(items);

    return NextResponse.json({
      success: true,
      pcbImage: preset.exerciseConfig?.pcbImage ?? null,
    });
  } catch (error: any) {
    console.error('Error updating preset:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/** DELETE /api/presets/[id] — Delete a preset and its dedicated image */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const filePath = getPresetPath(id);

    // Read the preset before deleting it so we can clean up its image.
    try {
      const existing: Preset = JSON.parse(await readFile(filePath, 'utf-8'));
      await deletePresetImage(existing.exerciseConfig?.pcbImage ?? '');
    } catch { /* ignore if file is already gone */ }

    // Delete preset file
    try {
      await unlink(filePath);
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }

    // Remove from index
    const items = await readIndex();
    const filtered = items.filter(item => item.id !== id);
    await writeIndex(filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting preset:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
