export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getRoles, addRole } from '@/lib/data';

export async function GET() {
  try {
    const roles = await getRoles();
    return NextResponse.json(roles);
  } catch (error) {
    console.error("[API GET /roles]", error);
    return NextResponse.json({ message: 'Erro ao buscar cargos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addRole(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /roles]", error);
    return NextResponse.json({ message: 'Erro ao adicionar cargo' }, { status: 500 });
  }
}
