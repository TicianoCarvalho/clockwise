export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSupportSettings, updateSupportSettings } from '@/lib/data';

/**
 * GET: Busca as configurações de suporte de um tenant específico.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    // Se o tenantId for nulo, vazio ou "undefined" (string comum em erros de client),
    // retornamos um estado neutro em vez de disparar erro 500 no servidor.
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return NextResponse.json({ 
        whatsapp: "", 
        email: "", 
        helpCenter: "" 
      });
    }

    const settings = await getSupportSettings(tenantId);
    
    // Garantimos que sempre retornamos um objeto válido para o frontend
    return NextResponse.json(settings || { 
      whatsapp: "", 
      email: "", 
      helpCenter: "" 
    });

  } catch (error: any) {
    console.error("[API GET /support-settings] Erro crítico:", error.message);
    return NextResponse.json(
      { message: 'Erro interno ao buscar configurações', error: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * PUT: Atualiza os dados de suporte.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, ...data } = body;

    // Validação estrita de presença do tenantId para evitar escritas em locais errados
    if (!tenantId) {
      return NextResponse.json(
        { message: 'O campo tenantId é obrigatório para atualização' }, 
        { status: 400 }
      );
    }

    // Sanitização simples: garante que não passamos dados nulos para o update
    const updateData = {
      whatsapp: data.whatsapp || "",
      email: data.email || "",
      helpCenter: data.helpCenter || "",
      updatedAt: new Date().toISOString() // Opcional: rastro de atualização
    };

    await updateSupportSettings(tenantId, updateData);
    
    return NextResponse.json({ 
      message: 'Configurações de suporte atualizadas com sucesso' 
    });

  } catch (error: any) {
    console.error("[API PUT /support-settings] Erro ao atualizar:", error.message);
    return NextResponse.json(
      { message: 'Falha na atualização dos dados', error: error.message }, 
      { status: 500 }
    );
  }
}