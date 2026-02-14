// src/app/api/terminal-config/save/route.ts
import { writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const terminalConfig = await request.json();

    const filePath = path.join(process.cwd(), 'src/data/terminal.override.json');
    await writeFile(filePath, JSON.stringify(terminalConfig, null, 2));

    return NextResponse.json({ success: true, message: 'Configurazione terminale salvata con successo' });
  } catch (error: any) {
    console.error('Error saving terminal config:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
