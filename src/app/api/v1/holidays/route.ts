export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getHolidays, addHoliday } from '@/lib/data';

export async function GET() {
  try {
    const holidays = await getHolidays();
    return NextResponse.json(holidays);
  } catch (error) {
    console.error("[API GET /holidays]", error);
    return NextResponse.json({ message: 'Erro ao buscar feriados' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addHoliday(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /holidays]", error);
    return NextResponse.json({ message: 'Erro ao adicionar feriado' }, { status: 500 });
  }
}
