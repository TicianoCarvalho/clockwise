export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { updateLocation, deleteLocation } from '@/lib/data';
import { geocodeAddress } from '@/ai/flows/geocode-address';
import { retryWithBackoff } from '@/lib/utils';

// Definição do tipo Promise para os parâmetros (Next.js 15)
type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  // 1. Aguarda o ID de forma assíncrona
  const { id } = await params;

  try {
    const body = await request.json();
    
    // Geocodificação com a IA (mantida a sua lógica de retry)
    const { latitude, longitude } = await retryWithBackoff(() => geocodeAddress({ address: body.address }));
    
    // 2. Ajustado para passar o ID separado, seguindo o padrão do Admin SDK que corrigimos
    await updateLocation(id, { 
        ...body, 
        latitude,
        longitude
    });

    return NextResponse.json({ message: 'Local atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /locations/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar local' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await deleteLocation(id);
    return NextResponse.json({ message: 'Local removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /locations/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover local' }, { status: 500 });
  }
}