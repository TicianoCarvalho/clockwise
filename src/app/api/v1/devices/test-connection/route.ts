export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { ipAddress, port, protocol, repUsername, repPassword } = await req.json();

    // 1. Validate Input
    if (!ipAddress || !port || !protocol || !repUsername || !repPassword) {
      return NextResponse.json(
        { error: 'Dados de conexão incompletos.', code: 'INCOMPLETE_DATA' },
        { status: 400 }
      );
    }

    // 2. Validate IP Format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json(
        { error: 'O formato do endereço IP é inválido.', code: 'INVALID_IP' },
        { status: 400 }
      );
    }

    // 3. Attempt Connection to REP-C
    const url = `${protocol.toLowerCase()}://${ipAddress}:${port}/api/status`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${repUsername}:${repPassword}`)}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        
        return NextResponse.json({
          success: true,
          message: '✅ Dispositivo encontrado e conectado com sucesso!',
          device: {
            model: data.model || 'Desconhecido',
            version: data.version || 'Desconhecida',
            serialNumber: data.serialNumber || 'Não informado',
            status: data.status || 'OK',
          },
        });
      } else {
        return NextResponse.json(
          { 
            error: '❌ Credenciais inválidas ou o dispositivo recusou a conexão.',
            code: 'AUTH_FAILED',
            status: response.status,
          },
          { status: 401 }
        );
      }

    } catch (fetchError: any) {
      clearTimeout(timeout);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            error: '❌ Timeout: O dispositivo não respondeu em 5 segundos. Verifique o IP e a porta.',
            code: 'TIMEOUT',
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        { 
          error: '❌ Não foi possível conectar ao dispositivo. Verifique se o IP e a porta estão corretos e se o dispositivo está na mesma rede.',
          code: 'CONNECTION_REFUSED',
          details: fetchError.message,
        },
        { status: 503 }
      );
    }

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Erro interno no servidor ao processar a requisição.',
        code: 'SERVER_ERROR',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
