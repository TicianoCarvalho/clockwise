export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateUser, deleteUser } from '@/lib/data';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateUser({ ...body, id: params.id });
    return NextResponse.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /users/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteUser(params.id);
    return NextResponse.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /users/${params.id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover usuário' }, { status: 500 });
  }
}
