export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getCompanies, addCompany } from '@/lib/data';

export async function GET() {
  try {
    const companies = await getCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error("[API GET /companies]", error);
    return NextResponse.json({ message: 'Erro ao buscar empresas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addCompany(body);
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[API POST /companies]", error);
    return NextResponse.json({ message: 'Erro ao adicionar empresa' }, { status: 500 });
  }
}
