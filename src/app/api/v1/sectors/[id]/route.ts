export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateSector, deleteSector } from '@/lib/data';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateSector({ ...body, id: params.id });
    return NextResponse.json({ message: 'Setor atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /sectors/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar setor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteSector(params.id);
    return NextResponse.json({ message: 'Setor removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /sectors/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover setor' }, { status: 500 });
  }
}
