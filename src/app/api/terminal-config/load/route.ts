// src/app/api/terminal-config/load/route.ts
import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/terminal.override.json');
    const data = await readFile(filePath, 'utf-8');

    return NextResponse.json({
      success: true,
      data: JSON.parse(data),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.code === 'ENOENT' ? 'File non trovato' : error.message },
      { status: 404 }
    );
  }
}
