export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getCompanyInfo, updateCompanyInfo } from '@/lib/data';

export async function GET() {
  try {
    const companyInfo = await getCompanyInfo();
    return NextResponse.json(companyInfo);
  } catch (error) {
    console.error("[API GET /company]", error);
    return NextResponse.json({ message: 'Erro ao buscar informações da empresa' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await updateCompanyInfo(body);
    return NextResponse.json({ message: 'Informações da empresa atualizadas com sucesso' });
  } catch (error) {
    console.error("[API PUT /company]", error);
    return NextResponse.json({ message: 'Erro ao atualizar informações da empresa' }, { status: 500 });
  }
}
