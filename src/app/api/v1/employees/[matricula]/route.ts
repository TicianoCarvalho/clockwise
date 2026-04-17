export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
// Nota: Certifique-se de que o seu lib/data use o adminDb como ajustamos
import { updateEmployee, deleteEmployee, getEmployeeById } from '@/lib/data';

// No Next.js 15, params precisa ser uma Promise
type RouteParams = {
  params: Promise<{ matricula: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  // 1. Aguarda o parâmetro (Obrigatório no Next 15)
  const { matricula } = await params;

  try {
    const body = await request.json();
    
    // 2. IMPORTANTE: Precisamos do tenantId para buscar o funcionário corretamente
    // Se o seu sistema for multi-tenant, você deve passar o tenantId aqui.
    // Usando um placeholder ou buscando do header/body se necessário.
    const tenantId = body.tenantId || "DEFAULT_TENANT";

    const employeeToUpdate = await getEmployeeById(matricula, tenantId);

    if (!employeeToUpdate || !employeeToUpdate.id) {
        return NextResponse.json({ message: 'Funcionário não encontrado para atualização' }, { status: 404 });
    }
    
    // 3. No Admin SDK, usamos o ID do documento para atualizar
    await updateEmployee(employeeToUpdate.id, body);
    
    return NextResponse.json({ message: 'Funcionário atualizado com sucesso' });
  } catch (error) {
    console.error(`[API PUT /employees/${matricula}]`, error);
    return NextResponse.json({ message: 'Erro ao atualizar funcionário' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { matricula } = await params;

  try {
    // Para deletar, também recomendamos buscar o ID primeiro ou 
    // garantir que a função deleteEmployee saiba lidar com a matrícula.
    // Se o deleteEmployee usar adminDb.collection('employees').doc(id).delete():
    const tenantId = "DEFAULT_TENANT"; // Ajustar conforme sua lógica
    const employee = await getEmployeeById(matricula, tenantId);
    
    if (employee && employee.id) {
        await deleteEmployee(employee.id);
        return NextResponse.json({ message: 'Funcionário removido com sucesso' });
    }
    
    return NextResponse.json({ message: 'Funcionário não encontrado' }, { status: 404 });
  } catch (error) {
    console.error(`[API DELETE /employees/${matricula}]`, error);
    return NextResponse.json({ message: 'Erro ao remover funcionário' }, { status: 500 });
  }
}