export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateJustification, deleteJustification } from '@/lib/data';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateJustification({ ...body, id: params.id });
    return NextResponse.json({ message: 'Justificativa atualizada com sucesso' });
  } catch (error) {
    console.error(`[API PUT /justifications/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar justificativa' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteJustification(params.id);
    return NextResponse.json({ message: 'Justificativa removida com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /justifications/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover justificativa' }, { status: 500 });
  }
}
