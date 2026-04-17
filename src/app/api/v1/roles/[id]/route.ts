export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateRole, deleteRole } from '@/lib/data';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateRole({ ...body, id: params.id });
    return NextResponse.json({ message: 'Cargo atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /roles/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar cargo' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteRole(params.id);
    return NextResponse.json({ message: 'Cargo removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /roles/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover cargo' }, { status: 500 });
  }
}
