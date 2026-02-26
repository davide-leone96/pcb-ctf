// src/app/api/presets/[id]/route.ts

import { readFile, writeFile, unlink } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import type { Preset } from '@/types/preset';
import { readIndex, writeIndex, getPresetPath } from '../_helpers';

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating preset:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/** DELETE /api/presets/[id] — Delete a preset */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Delete preset file
    const filePath = getPresetPath(id);
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
