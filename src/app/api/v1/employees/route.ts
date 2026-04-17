export const dynamic = 'force-dynamic'; 

import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getEmployees, addEmployee } from '@/lib/data';

export async function GET() {
  try {
    const employees = await getEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error("[API GET /employees]", error);
    return NextResponse.json({ message: 'Erro ao buscar funcionários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addEmployee(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /employees]", error);
    return NextResponse.json({ message: 'Erro ao adicionar funcionário' }, { status: 500 });
  }
}
