export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getRules, updateRules } from '@/lib/data';

export async function GET() {
  try {
    const rules = await getRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error("[API GET /rules]", error);
    return NextResponse.json({ message: 'Erro ao buscar regras' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await updateRules(body);
    return NextResponse.json({ message: 'Regras atualizadas com sucesso' });
  } catch (error) {
    console.error("[API PUT /rules]", error);
    return NextResponse.json({ message: 'Erro ao atualizar regras' }, { status: 500 });
  }
}
