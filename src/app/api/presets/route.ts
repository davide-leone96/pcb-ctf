// src/app/api/presets/route.ts

import { writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import type { Preset } from '@/types/preset';
import { readIndex, writeIndex, getPresetPath, generatePresetId } from './_helpers';

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

    return NextResponse.json({ success: true, id: preset.metadata.id });
  } catch (error: any) {
    console.error('Error creating preset:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
