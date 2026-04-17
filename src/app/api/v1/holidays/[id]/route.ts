export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateHoliday, deleteHoliday } from '@/lib/data';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateHoliday({ ...body, id: params.id });
    return NextResponse.json({ message: 'Feriado atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /holidays/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar feriado' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteHoliday(params.id);
    return NextResponse.json({ message: 'Feriado removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /holidays/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover feriado' }, { status: 500 });
  }
}
