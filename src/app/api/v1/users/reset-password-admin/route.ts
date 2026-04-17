export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Note: Here we'd typically also verify the requesting user is an authorized admin.
    // This is handled by Firebase App Check or a custom middleware in a real production app.
    const { cpf } = await request.json();

    if (!cpf) {
      return NextResponse.json({ message: 'CPF do colaborador é obrigatório.' }, { status: 400 });
    }

    const cleanedCpf = String(cpf).replace(/\D/g, '');
    const maskedEmail = `${cleanedCpf}@ponto.clockwise`;
    const temporaryPassword = 'mudar123';

    // 1. Get Auth user by masked email
    let user;
    try {
        user = await adminAuth.getUserByEmail(maskedEmail);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ message: 'Conta de acesso não encontrada para este CPF. O colaborador precisa fazer o primeiro acesso.' }, { status: 404 });
        }
        throw error; // Re-throw other errors
    }
    
    // 2. Update password in Firebase Auth to the temporary one
    await adminAuth.updateUser(user.uid, {
      password: temporaryPassword,
    });

    return NextResponse.json({ message: 'Senha resetada para "mudar123" com sucesso.' });

  } catch (error: any) {
    console.error('Admin Password Reset Error:', error);
    return NextResponse.json({ message: error.message || 'Ocorreu um erro interno no servidor.' }, { status: 500 });
  }
}
