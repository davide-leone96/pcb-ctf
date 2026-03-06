import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nessun file fornito' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File troppo grande. Massimo 50 MB.' },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name) || '.bin';
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = `firmware-${Date.now()}-${baseName}${ext}`;

    const destDir = path.join(process.cwd(), 'public/uploads');
    await mkdir(destDir, { recursive: true });

    const destPath = path.join(destDir, safeFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(destPath, buffer);

    return NextResponse.json({
      success: true,
      path: `/uploads/${safeFilename}`,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error('Error uploading firmware file:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
