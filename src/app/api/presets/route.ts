// src/app/api/presets/route.ts

import { writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import type { Preset } from '@/types/preset';
import {
  readIndex, writeIndex, getPresetPath, generatePresetId,
  copyImageForPreset,
} from './_helpers';

/** GET /api/presets — List all presets */
export async function GET() {
  try {
    const items = await readIndex();
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/** POST /api/presets — Create a new preset */
export async function POST(request: NextRequest) {
  try {
    const preset: Preset = await request.json();

    // Generate id if not provided
    if (!preset.metadata.id) {
      preset.metadata.id = generatePresetId(preset.metadata.name);
    }

    const now = new Date().toISOString();
    preset.metadata.createdAt = preset.metadata.createdAt || now;
    preset.metadata.updatedAt = now;

    // Copy the current working image to a preset-owned file so each preset
    // has an independent copy that survives future uploads/transformations.
    const srcImage = preset.exerciseConfig?.pcbImage;
    if (srcImage) {
      const newImagePath = await copyImageForPreset(srcImage, preset.metadata.id);
      if (newImagePath) {
        preset.exerciseConfig.pcbImage = newImagePath;
      }
    }

    // Write preset file
    const filePath = getPresetPath(preset.metadata.id);
    await writeFile(filePath, JSON.stringify(preset, null, 2), 'utf-8');

    // Update index
    const items = await readIndex();
    items.push({
      id: preset.metadata.id,
      name: preset.metadata.name,
      description: preset.metadata.description,
      createdAt: preset.metadata.createdAt,
      updatedAt: preset.metadata.updatedAt,
    });
    await writeIndex(items);

    return NextResponse.json({
      success: true,
      id: preset.metadata.id,
      // Return the (possibly updated) pcbImage so the client can sync its state.
      pcbImage: preset.exerciseConfig?.pcbImage ?? null,
    });
  } catch (error: any) {
    console.error('Error creating preset:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
