// src/app/api/config/save/route.ts
import { writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const exerciseData = await request.json();

    if (!exerciseData.steps || exerciseData.steps.length === 0) {
      const objectives = exerciseData.components.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        instruction: comp.instruction || `Identifica ${comp.name}`,
        hint: comp.hint || 'Osserva attentamente la scheda',
        flagPart: comp.flagPart,
        coords: comp.coords,
      }));

      const expectedFlag = `flag{${exerciseData.components.map((c: any) => c.flagPart).join('')}}`;

      exerciseData.steps = [{
        id: 'step-1',
        title: 'Hardware Analysis',
        description: 'Identifica tutti i componenti sulla scheda PCB per completare la sfida.',
        objectives,
        expectedFlag,
      }];
    }

    const filePath = path.join(process.cwd(), 'src/data/exercise.override.json');
    await writeFile(filePath, JSON.stringify(exerciseData, null, 2));

    return NextResponse.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error: any) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
