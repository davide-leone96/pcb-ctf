import { unlink, access } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 },
      );
    }

    const fullPath = path.join(process.cwd(), 'public', filePath);

    // Verify the file is inside public/uploads/hints/
    const resolvedPath = path.resolve(fullPath);
    const hintsDir = path.resolve(path.join(process.cwd(), 'public/uploads/hints'));
    if (!resolvedPath.startsWith(hintsDir)) {
      return NextResponse.json(
        { success: false, error: 'Path not allowed' },
        { status: 400 },
      );
    }

    await access(fullPath);
    await unlink(fullPath);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ success: true });
    }
    console.error('Error deleting hint file:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
