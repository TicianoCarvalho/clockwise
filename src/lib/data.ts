import { adminDb } from './firebase-admin-config';

// ======================================================
// VALIDADORES
// ======================================================

function validateFirebase() {
  if (!adminDb) {
    throw new Error(
      'Firebase Admin indisponível'
    );
  }
}

function validateTenant(
  tenantId: string
) {
  if (
    !tenantId ||
    tenantId === 'undefined' ||
    tenantId === 'null'
  ) {
    throw new Error(
      'TenantId inválido'
    );
  }
}

// ======================================================
// HELPERS
// ======================================================

function tenantRef(
  tenantId: string
) {
  validateFirebase();

  validateTenant(tenantId);

  return adminDb!
    .collection('tenants')
    .doc(tenantId);
}

// ======================================================
// GENERIC SAFE GET
// ======================================================

async function safeGetCollection(
  path: FirebaseFirestore.CollectionReference
) {
  try {
    const snap = await path.get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(
      '[Firestore Collection Error]',
      error
    );

    throw new Error(
      'Erro ao buscar coleção'
    );
  }
}

// ======================================================
// SCHEDULES
// ======================================================

export const getSchedules = async (
  tenantId: string
) => {
  return safeGetCollection(
    tenantRef(tenantId).collection(
      'schedules'
    )
  );
};

// ======================================================
// SECTORS
// ======================================================

export const getSectors = async (
  tenantId: string
) => {
  return safeGetCollection(
    tenantRef(tenantId).collection(
      'sectors'
    )
  );
};

// ======================================================
// SCALES
// ======================================================

export const getScales = async (
  tenantId: string
) => {
  return safeGetCollection(
    tenantRef(tenantId).collection(
      'scales'
    )
  );
};

// ======================================================
// BRANCHES
// ======================================================

export const getBranches = async (
  tenantId: string
) => {
  return safeGetCollection(
    tenantRef(tenantId).collection(
      'branches'
    )
  );
};

// ======================================================
// LOCATIONS
// ======================================================

export const getLocations = async (
  tenantId: string
) => {
  return safeGetCollection(
    tenantRef(tenantId).collection(
      'locations'
    )
  );
};

// ======================================================
// EMPLOYEES
// ======================================================

export const getEmployees = async (
  tenantId: string
) => {
  return safeGetCollection(
    tenantRef(tenantId).collection(
      'employees'
    )
  );
};

export const getEmployeeById = async (
  tenantId: string,
  employeeId: string
) => {
  try {
    const snap = await tenantRef(
      tenantId
    )
      .collection('employees')
      .doc(employeeId)
      .get();

    if (!snap.exists) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    };
  } catch (error) {
    console.error(
      '[Employee Error]',
      error
    );

    throw new Error(
      'Erro ao buscar funcionário'
    );
  }
};

export const addEmployee = async (
  tenantId: string,
  data: any
) => {
  try {
    return await tenantRef(tenantId)
      .collection('employees')
      .add({
        ...data,
        tenantId,
        createdAt:
          new Date().toISOString(),
      });
  } catch (error) {
    console.error(
      '[Add Employee Error]',
      error
    );

    throw new Error(
      'Erro ao criar funcionário'
    );
  }
};

export const updateEmployee = async (
  tenantId: string,
  employeeId: string,
  data: any
) => {
  try {
    return await tenantRef(tenantId)
      .collection('employees')
      .doc(employeeId)
      .update({
        ...data,
        updatedAt:
          new Date().toISOString(),
      });
  } catch (error) {
    console.error(
      '[Update Employee Error]',
      error
    );

    throw new Error(
      'Erro ao atualizar funcionário'
    );
  }
};

// ======================================================
// PUNCHES
// ======================================================

// 🔥 PADRÃO SaaS ESCALÁVEL
// tenants/{tenantId}/punches

export const addPunch = async (
  tenantId: string,
  punchData: any
) => {
  try {
    return await tenantRef(tenantId)
      .collection('punches')
      .add({
        ...punchData,
        createdAt:
          new Date().toISOString(),
      });
  } catch (error) {
    console.error(
      '[Punch Error]',
      error
    );

    throw new Error(
      'Erro ao registrar ponto'
    );
  }
};

export const getTodayPunches =
  async (
    tenantId: string,
    employeeId: string
  ) => {
    try {
      const today = new Date()
        .toISOString()
        .split('T')[0];

      const snap = await tenantRef(
        tenantId
      )
        .collection('punches')
        .where(
          'employeeId',
          '==',
          employeeId
        )
        .where('date', '==', today)
        .orderBy(
          'createdAt',
          'asc'
        )
        .get();

      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(
        '[Get Punches Error]',
        error
      );

      throw new Error(
        'Erro ao buscar pontos'
      );
    }
  };