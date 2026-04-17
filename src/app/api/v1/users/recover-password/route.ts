export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { cpf, birthDate, newPassword } = await request.json();

    if (!cpf || !birthDate || !newPassword) {
      return NextResponse.json({ message: 'Dados incompletos.' }, { status: 400 });
    }

    const cleanedCpf = cpf.replace(/\D/g, '');

    // 1. Find employee in Firestore by CPF
    const employeesRef = adminDb.collectionGroup('employees');
    const q = employeesRef.where('cpf', '==', cleanedCpf).limit(1);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return NextResponse.json({ message: 'CPF não encontrado em nosso sistema.' }, { status: 404 });
    }

    const employeeDoc = querySnapshot.docs[0];
    const employeeData = employeeDoc.data();

    // 2. Verify birth date
    if (employeeData.birthDate !== birthDate) {
      return NextResponse.json({ message: 'A data de nascimento não confere com nossos registros.' }, { status: 403 });
    }

    // 3. Get Auth user by masked email
    const maskedEmail = `${cleanedCpf}@ponto.clockwise`;
    let user;
    try {
        user = await adminAuth.getUserByEmail(maskedEmail);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ message: 'Conta de acesso não encontrada. Realize o primeiro acesso.' }, { status: 404 });
        }
        throw error;
    }
    
    // 4. Update password in Firebase Auth
    await adminAuth.updateUser(user.uid, {
      password: newPassword,
    });

    return NextResponse.json({ message: 'Senha redefinida com sucesso!' });

  } catch (error: any) {
    console.error('Password Recovery Error:', error);
    return NextResponse.json({ message: error.message || 'Ocorreu um erro interno no servidor.' }, { status: 500 });
  }
}
