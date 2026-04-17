export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getJustifications, addJustification } from '@/lib/data';

export async function GET() {
  try {
    const justifications = await getJustifications();
    return NextResponse.json(justifications);
  } catch (error) {
    console.error("[API GET /justifications]", error);
    return NextResponse.json({ message: 'Erro ao buscar justificativas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addJustification(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /justifications]", error);
    return NextResponse.json({ message: 'Erro ao adicionar justificativa' }, { status: 500 });
  }
}
