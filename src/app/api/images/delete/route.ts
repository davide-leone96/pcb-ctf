import { unlink, access } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_IMAGES = ['pcb.jpg', 'pcb_v1.png', 'pcb_v2.jpg', 'pcb_v3.png', 'pcb_v4.png'];

export async function POST(request: NextRequest) {
  try {
    const { imagePath } = await request.json();

    if (!imagePath || typeof imagePath !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Percorso immagine non valido' },
        { status: 400 },
      );
    }

    const filename = path.basename(imagePath);

    if (PROTECTED_IMAGES.includes(filename)) {
      return NextResponse.json(
        { success: false, error: 'Impossibile eliminare le immagini di default' },
        { status: 400 },
      );
    }

    const filePath = path.join(process.cwd(), 'public', imagePath);

    // Verify the file is inside public/images/
    const resolvedPath = path.resolve(filePath);
    const imagesDir = path.resolve(path.join(process.cwd(), 'public/images'));
    if (!resolvedPath.startsWith(imagesDir)) {
      return NextResponse.json(
        { success: false, error: 'Percorso non consentito' },
        { status: 400 },
      );
    }

    await access(filePath);
    await unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ success: true });
    }
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
