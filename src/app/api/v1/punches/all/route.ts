export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getAllPunches } from '@/lib/data';

export async function GET() {
  try {
    const punches = await getAllPunches();
    return NextResponse.json(punches);
  } catch (error) {
    console.error("[API GET /punches/all]", error);
    return NextResponse.json({ message: 'Erro ao buscar todos os pontos' }, { status: 500 });
  }
}
