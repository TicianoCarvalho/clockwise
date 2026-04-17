import { NextResponse } from 'next/server';
import { getEmployees } from '@/lib/data';

export async function GET(request: Request, { params }: { params: { cpf: string } }) {
  try {
    const cpf = params.cpf;
    const cleanedCpf = cpf.replace(/\D/g, '');

    if (!cleanedCpf) {
      return NextResponse.json({ message: 'CPF inválido' }, { status: 400 });
    }

    const employees = await getEmployees();
    // Find in both legacy JSON and potentially new Firestore-synced data
    const employee = employees.find(e => {
        const employeeCpf = e.cpf?.replace(/\D/g, '');
        return employeeCpf === cleanedCpf;
    });

    if (!employee) {
      return NextResponse.json({ message: 'Colaborador não encontrado' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error(`[API GET /employees/by-cpf/${params.cpf}]`, error);
    return NextResponse.json({ message: 'Erro ao buscar colaborador' }, { status: 500 });
  }
}
