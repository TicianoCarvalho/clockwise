import { adminDb } from './firebase-admin-config';

// --- HELPERS CRÍTICOS ---

function validateTenant(tenantId: string) {
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
    throw new Error('TenantId inválido ou não informado');
  }
}

function tenantRef(tenantId: string) {
  validateTenant(tenantId);
  return adminDb.collection('tenants').doc(tenantId);
}

// --- INTERFACES (mantidas) ---
// (sem alteração aqui)

// --- BUSCAS GENÉRICAS ---

async function safeGetCollection(path: FirebaseFirestore.CollectionReference) {
  try {
    const snap = await path.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    console.error('Erro Firestore:', error);
    throw new Error('Falha ao buscar dados');
  }
}

// --- SCHEDULES / SECTORS / SCALES ---

export const getSchedules = async (tenantId: string) => {
  return safeGetCollection(tenantRef(tenantId).collection('schedules'));
};

export const getSectors = async (tenantId: string) => {
  return safeGetCollection(tenantRef(tenantId).collection('sectors'));
};

export const getScales = async (tenantId: string) => {
  return safeGetCollection(tenantRef(tenantId).collection('scales'));
};

// --- BRANCHES ---

export const getBranches = async (tenantId: string) => {
  return safeGetCollection(tenantRef(tenantId).collection('branches'));
};

// --- LOCATIONS ---

export const getLocations = async (tenantId: string) => {
  return safeGetCollection(tenantRef(tenantId).collection('locations'));
};

// --- EMPLOYEES ---

export const getEmployees = async (tenantId: string) => {
  return safeGetCollection(tenantRef(tenantId).collection('employees'));
};

export const getEmployeeById = async (tenantId: string, employeeId: string) => {
  try {
    const doc = await tenantRef(tenantId)
      .collection('employees')
      .doc(employeeId)
      .get();

    return doc.exists ? { id: doc.id, ...doc.data() } : null;

  } catch (error) {
    console.error('Erro ao buscar funcionário:', error);
    throw new Error('Erro ao buscar funcionário');
  }
};

// 🔥 CORRIGIDO: NÃO USAR CPF COMO ID
export const addEmployee = async (tenantId: string, data: Partial<Employee>) => {
  try {
    const payload = {
      ...data,
      tenantId,
      createdAt: new Date().toISOString()
    };

    return await tenantRef(tenantId)
      .collection('employees')
      .add(payload);

  } catch (error) {
    console.error('Erro ao criar funcionário:', error);
    throw new Error('Erro ao criar funcionário');
  }
};

export const updateEmployee = async (tenantId: string, employeeId: string, data: Partial<Employee>) => {
  try {
    return await tenantRef(tenantId)
      .collection('employees')
      .doc(employeeId)
      .update({
        ...data,
        updatedAt: new Date().toISOString()
      });

  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error);
    throw new Error('Erro ao atualizar funcionário');
  }
};

// --- PUNCHES ---

export const addPunch = async (tenantId: string, employeeId: string, punchData: any) => {
  try {
    return await tenantRef(tenantId)
      .collection('employees')
      .doc(employeeId)
      .collection('punches')
      .add({
        ...punchData,
        serverTimestamp: new Date().toISOString()
      });

  } catch (error) {
    console.error('Erro ao registrar ponto:', error);
    throw new Error('Erro ao registrar ponto');
  }
};

export const getTodayPunches = async (tenantId: string, employeeId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const snap = await tenantRef(tenantId)
      .collection('employees')
      .doc(employeeId)
      .collection('punches')
      .where('date', '==', today)
      .orderBy('serverTimestamp', 'asc')
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  } catch (error) {
    console.error('Erro ao buscar pontos:', error);
    throw new Error('Erro ao buscar pontos');
  }
};