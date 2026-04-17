export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getSchedules, addSchedule } from '@/lib/data';

export async function GET() {
  try {
    const schedules = await getSchedules();
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("[API GET /schedules]", error);
    return NextResponse.json({ message: 'Erro ao buscar horários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addSchedule(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /schedules]", error);
    return NextResponse.json({ message: 'Erro ao adicionar horário' }, { status: 500 });
  }
}
