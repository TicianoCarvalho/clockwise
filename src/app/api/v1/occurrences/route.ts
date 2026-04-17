export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getAfastamentos, addAfastamento } from '@/lib/data';

export async function GET() {
  try {
    const afastamentos = await getAfastamentos();
    return NextResponse.json(afastamentos);
  } catch (error) {
    console.error("[API GET /occurrences -> afastamentos]", error);
    return NextResponse.json({ message: 'Erro ao buscar afastamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newAfastamento = { ...body, id: String(Date.now()) };
    await addAfastamento(newAfastamento);
    return NextResponse.json(newAfastamento, { status: 201 });
  } catch (error) {
    console.error("[API POST /occurrences -> afastamentos]", error);
    return NextResponse.json({ message: 'Erro ao adicionar afastamento' }, { status: 500 });
  }
}
