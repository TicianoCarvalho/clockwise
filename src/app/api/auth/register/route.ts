import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin-config';
import { adminAuth } from '@/lib/firebase-admin-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, companyName, cnpj } = body;

    // 🔴 validação básica
    if (!email || !password || !companyName) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // 1️⃣ Criar usuário no Auth
    const user = await adminAuth.createUser({
      email,
      password
    });

    // 2️⃣ Criar tenant
    const tenantRef = await adminDb.collection('tenants').add({
      name: companyName,
      cnpj: cnpj || '',
      createdAt: new Date().toISOString(),
      plan: 'soft'
    });

    const tenantId = tenantRef.id;

    // 3️⃣ Criar ADMIN dentro do tenant
    await adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('users')
      .doc(user.uid)
      .set({
        email,
        role: 'admin',
        createdAt: new Date().toISOString()
      });

    // 4️⃣ Vincular usuário ao tenant
    await adminDb.collection('users').doc(user.uid).set({
      tenantId,
      email
    });

    // 5️⃣ Criar config inicial
    await adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('support')
      .set({
        whatsapp: '',
        email: '',
        helpCenter: ''
      });

    return NextResponse.json({
      message: 'Empresa criada com sucesso',
      tenantId
    });

  } catch (error: any) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}