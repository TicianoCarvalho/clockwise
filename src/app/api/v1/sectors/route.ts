export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getSectors, addSector } from '@/lib/data';

export async function GET() {
  try {
    const sectors = await getSectors();
    return NextResponse.json(sectors);
  } catch (error) {
    console.error("[API GET /sectors]", error);
    return NextResponse.json({ message: 'Erro ao buscar setores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addSector(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /sectors]", error);
    return NextResponse.json({ message: 'Erro ao adicionar setor' }, { status: 500 });
  }
}
