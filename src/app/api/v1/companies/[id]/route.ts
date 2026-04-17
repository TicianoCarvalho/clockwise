export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
// Nota: Certifique-se de que o seu lib/data use o adminDb como ajustamos antes
import { getCompanyById, updateCompany, deleteCompany } from '@/lib/data';

// No Next.js 15, params deve ser tratado como uma Promise
type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  // O segredo está em dar o await no params logo no início
  const { id } = await params;

  try {
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ message: 'Empresa não encontrada' }, { status: 404 });
    }
    return NextResponse.json(company);
  } catch (error) {
    console.error(`[API GET /companies/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao buscar empresa' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    // Passamos o ID e os dados para a função de atualização
    await updateCompany(id, body); 
    
    return NextResponse.json({ message: 'Empresa atualizada com sucesso' });
  } catch (error) {
    console.error(`[API PUT /companies/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar empresa' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await deleteCompany(id);
    return NextResponse.json({ message: 'Empresa removida com sucesso' });
  } catch (error) {
    console.error(`[API DELETE /companies/${id}]`, error);
    return NextResponse.json({ message: 'Erro ao remover empresa' }, { status: 500 });
  }
}