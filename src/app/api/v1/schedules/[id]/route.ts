export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateSchedule, deleteSchedule } from '@/lib/data';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateSchedule({ ...body, id: params.id });
    return NextResponse.json({ message: 'Horário atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /schedules/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar horário' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteSchedule(params.id);
    return NextResponse.json({ message: 'Horário removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /schedules/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover horário' }, { status: 500 });
  }
}
