export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupportSettings, updateSupportSettings } from '@/lib/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    // Se o front-end ainda não carregou o tenantId, não damos erro.
    // Retornamos um objeto padrão para a página não ficar "travada" e crua.
    if (!tenantId) {
      return NextResponse.json({ whatsapp: "", email: "", helpCenter: "" });
    }

    const settings = await getSupportSettings(tenantId);
    return NextResponse.json(settings || { whatsapp: "", email: "", helpCenter: "" });
  } catch (error: any) {
    console.error("[API GET /support-settings] Erro:", error.message);
    return NextResponse.json({ message: 'Erro interno no servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, ...data } = body;

    if (!tenantId) {
      return NextResponse.json({ message: 'tenantId é obrigatório' }, { status: 400 });
    }

    await updateSupportSettings(tenantId, data);
    return NextResponse.json({ message: 'Configurações atualizadas' });
  } catch (error: any) {
    console.error("[API PUT /support-settings] Erro:", error.message);
    return NextResponse.json({ message: 'Erro ao atualizar' }, { status: 500 });
  }
}