export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { getDeviceById, updateDevice, deleteDevice } from '@/lib/data';

// No Next.js 15, os parâmetros de rota são obrigatoriamente Promises
type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  // Extração assíncrona do ID
  const { id } = await params;

  try {
    const device = await getDeviceById(id);
    if (!device) {
      return NextResponse.json({ message: 'Dispositivo não encontrado' }, { status: 404 });
    }
    return NextResponse.json(device);
  } catch (error) {
    console.error(`[API GET /devices/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao buscar dispositivo' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    // Ajustado para passar o ID separado, conforme o padrão do Firestore Admin que corrigimos no data.ts
    await updateDevice(id, body); 
    
    return NextResponse.json({ message: 'Dispositivo atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /devices/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar dispositivo' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await deleteDevice(id);
    return NextResponse.json({ message: 'Dispositivo removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /devices/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover dispositivo' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    const { id } = await params;

    try {
        const body = await request.json();
        const device = await getDeviceById(id);
        
        if (!device) {
            return NextResponse.json({ message: `Dispositivo ${id} não encontrado.` }, { status: 404 });
        }

        await updateDevice(id, body);

        return NextResponse.json({ message: `Status do dispositivo ${id} atualizado.` });
    } catch (error) {
        console.error(`[API PATCH /devices/${id}]`, error);
        return NextResponse.json({ message: 'Erro ao atualizar o status do dispositivo' }, { status: 500 });
    }
}