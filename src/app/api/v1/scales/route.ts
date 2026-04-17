export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getScales, addScale } from '@/lib/data';

export async function GET() {
  try {
    const scales = await getScales();
    return NextResponse.json(scales);
  } catch (error) {
    console.error("[API GET /scales]", error);
    return NextResponse.json({ message: 'Erro ao buscar escalas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addScale(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /scales]", error);
    return NextResponse.json({ message: 'Erro ao adicionar escala' }, { status: 500 });
  }
}
