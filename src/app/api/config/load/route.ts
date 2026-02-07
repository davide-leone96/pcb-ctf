// src/app/api/config/load/route.ts
import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/exercise.override.json');
    const data = await readFile(filePath, 'utf-8');

    return NextResponse.json({
      success: true,
      data: JSON.parse(data),
    });
  } catch (error: any) {
    // File non trovato o errore di lettura
    return NextResponse.json(
      { success: false, error: error.code === 'ENOENT' ? 'File non trovato' : error.message },
      { status: 404 }
    );
  }
}
