import { NextResponse } from 'next/server';

import {
  adminAuth,
  adminDb
} from '@/lib/firebase-admin-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      password,
      companyName,
      cnpj
    } = body;

    // =========================
    // VALIDAÇÕES
    // =========================

    if (!email || !password || !companyName || !cnpj) {
      return NextResponse.json(
        {
          error: 'Todos os campos são obrigatórios'
        },
        {
          status: 400
        }
      );
    }

    // sanitiza CNPJ
    const tenantId = cnpj.replace(/\D/g, '');

    if (tenantId.length < 14) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido'
        },
        {
          status: 400
        }
      );
    }

    // =========================
    // VERIFICA TENANT EXISTENTE
    // =========================

    const tenantRef = adminDb
      .collection('tenants')
      .doc(tenantId);

    const tenantSnap = await tenantRef.get();

    if (tenantSnap.exists) {
      return NextResponse.json(
        {
          error: 'Empresa já cadastrada'
        },
        {
          status: 409
        }
      );
    }

    // =========================
    // VERIFICA EMAIL EXISTENTE
    // =========================

    try {
      await adminAuth.getUserByEmail(email);

      return NextResponse.json(
        {
          error: 'Email já cadastrado'
        },
        {
          status: 409
        }
      );
    } catch {
      // email não existe -> segue fluxo
    }

    // =========================
    // CRIA USUÁRIO AUTH
    // =========================

    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: companyName
    });

    // =========================
    // CRIA TENANT
    // =========================

    await tenantRef.set({
      id: tenantId,
      name: companyName,
      cnpj: tenantId,
      plan: 'soft',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    // =========================
    // USERS GLOBAL
    // =========================

    await adminDb
      .collection('users')
      .doc(authUser.uid)
      .set({
        uid: authUser.uid,
        email,
        role: 'admin',
        tenantId,
        companyName,
        createdAt: new Date().toISOString()
      });

    // =========================
    // EMPLOYEE ADMIN
    // =========================

    await adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('employees')
      .doc(authUser.uid)
      .set({
        uid: authUser.uid,
        email,
        name: companyName,
        role: 'admin',
        accessLevel: 'admin',
        tenantId,
        status: 'Ativo',
        createdAt: new Date().toISOString()
      });

    // =========================
    // SETTINGS INICIAL
    // =========================

    await adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('support')
      .set({
        whatsapp: '',
        email,
        helpCenter: '',
        createdAt: new Date().toISOString()
      });

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json({
      success: true,
      message: 'Empresa criada com sucesso',
      tenantId
    });

  } catch (error: any) {
    console.error(
      '[REGISTER ERROR]',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Erro interno ao criar empresa'
      },
      {
        status: 500
      }
    );
  }
}