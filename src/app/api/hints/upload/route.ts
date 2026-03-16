import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB per file

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 },
      );
    }

    const destDir = path.join(process.cwd(), 'public/uploads/hints');
    await mkdir(destDir, { recursive: true });

    const uploaded: { path: string; fileName: string }[] = [];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: `File "${file.name}" too large. Max 50 MB.` },
          { status: 400 },
        );
      }

      const ext = path.extname(file.name) || '';
      const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const safeFilename = `hint-${Date.now()}-${baseName}${ext}`;

      const destPath = path.join(destDir, safeFilename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(destPath, buffer);

      uploaded.push({
        path: `/uploads/hints/${safeFilename}`,
        fileName: file.name,
      });
    }

    return NextResponse.json({ success: true, files: uploaded });
  } catch (error: any) {
    console.error('Error uploading hint files:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
