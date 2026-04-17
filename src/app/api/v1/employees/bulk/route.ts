export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getEmployees, addEmployee, type Employee } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const newEmployees: Employee[] = await request.json();
    const existingEmployees = await getEmployees();
    const existingEmails = new Set(existingEmployees.map(e => e.email));

    let importedCount = 0;
    let skippedCount = 0;

    const promises = newEmployees.map(async (newEmp) => {
        if (existingEmails.has(newEmp.email)) {
            skippedCount++;
        } else {
            await addEmployee({
                ...newEmp,
                status: 'Ativo'
            });
            importedCount++;
        }
    });

    await Promise.all(promises);
    
    return NextResponse.json({
      message: "Importação concluída",
      importedCount,
      skippedCount,
    }, { status: 200 });

  } catch (error) {
    console.error("[API POST /employees/bulk]", error);
    return NextResponse.json({ message: 'Ocorreu um erro interno no servidor durante a importação.' }, { status: 500 });
  }
}
