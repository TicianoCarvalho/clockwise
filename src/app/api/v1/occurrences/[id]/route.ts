export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
// Nota: O lib/data já deve estar usando o adminDb conforme configuramos
import { updateAfastamento, deleteAfastamento } from '@/lib/data';

// Definição da Promise para os parâmetros da rota
type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  // 1. Aguarda a resolução do parâmetro ID
  const { id } = await params;

  try {
    const body = await request.json();
    
    // 2. Ajustado para passar o ID e o corpo separadamente,
    // garantindo compatibilidade com o Admin SDK no Firestore
    await updateAfastamento(id, body); 
    
    return NextResponse.json({ message: 'Afastamento atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /occurrences/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar afastamento' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  // 1. Aguarda a resolução do parâmetro ID
  const { id } = await params;

  try {
    await deleteAfastamento(id);
    return NextResponse.json({ message: 'Afastamento removido com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /occurrences/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover afastamento' }, { status: 500 });
  }
}