export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateScale, deleteScale } from '@/lib/data';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateScale({ ...body, id: params.id });
    return NextResponse.json({ message: 'Escala atualizada com sucesso' });
  } catch (error) {
    console.error(`[API PUT /scales/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar escala' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteScale(params.id);
    return NextResponse.json({ message: 'Escala removida com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /scales/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover escala' }, { status: 500 });
  }
}
