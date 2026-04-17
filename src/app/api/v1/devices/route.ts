export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getDevices, addDevice } from '@/lib/data';

export async function GET() {
  try {
    const devices = await getDevices();
    return NextResponse.json(devices);
  } catch (error) {
    console.error("[API GET /devices]", error);
    return NextResponse.json({ message: 'Erro ao buscar dispositivos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addDevice(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /devices]", error);
    return NextResponse.json({ message: 'Erro ao adicionar dispositivo' }, { status: 500 });
  }
}
