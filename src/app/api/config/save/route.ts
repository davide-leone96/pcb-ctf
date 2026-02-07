// src/app/api/config/save/route.ts
import { writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const exerciseData = await request.json();
    const filePath = path.join(process.cwd(), 'src/data/exercise.override.json');

    await writeFile(filePath, JSON.stringify(exerciseData, null, 2));

    return NextResponse.json({ success: true, message: 'Configurazione salvata con successo' });
  } catch (error: any) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
