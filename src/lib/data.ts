import { adminDb } from './firebase-admin-config';

// --- INTERFACES ---
export interface Employee {
  id?: string;
  matricula: string;
  name: string;
  cpf: string;
  email?: string;
  tenantId: string;
}

// --- CONFIGURAÇÕES DE SUPORTE ---
export const getSupportSettings = async (tenantId: string) => {
  try {
    const snap = await adminDb.collection('support_settings').where('tenantId', '==', tenantId).limit(1).get();
    if (snap.empty) return { whatsapp: "", email: "", helpCenter: "" };
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (error) { return { whatsapp: "", email: "", helpCenter: "" }; }
};

export const updateSupportSettings = async (tenantId: string, data: any) => {
  const snap = await adminDb.collection('support_settings').where('tenantId', '==', tenantId).limit(1).get();
  if (snap.empty) return adminDb.collection('support_settings').add({ ...data, tenantId });
  return adminDb.collection('support_settings').doc(snap.docs[0].id).update(data);
};

// --- EMPRESAS (TENANTS) ---
export const getCompanies = async () => {
  const snap = await adminDb.collection('tenants').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getCompanyById = async (id: string) => {
  const doc = await adminDb.collection('tenants').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const addCompany = async (data: any) => adminDb.collection('tenants').add(data);
export const updateCompany = async (id: string, data: any) => adminDb.collection('tenants').doc(id).update(data);
export const deleteCompany = async (id: string) => adminDb.collection('tenants').doc(id).delete();
export const getCompanyInfo = async (tenantId: string) => getCompanyById(tenantId);
export const updateCompanyInfo = async (tenantId: string, data: any) => updateCompany(tenantId, data);

// --- DISPOSITIVOS ---
export const getDevices = async (tenantId: string) => {
  const snap = await adminDb.collection('devices').where('tenantId', '==', tenantId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getDeviceById = async (id: string) => {
  const doc = await adminDb.collection('devices').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const addDevice = async (data: any) => adminDb.collection('devices').add(data);
export const updateDevice = async (id: string, data: any) => adminDb.collection('devices').doc(id).update(data);
export const deleteDevice = async (id: string) => adminDb.collection('devices').doc(id).delete();
export const updateDeviceLastSeen = async (deviceId: string) => {
  const snap = await adminDb.collection('devices').where('deviceId', '==', deviceId).limit(1).get();
  if (!snap.empty) await snap.docs[0].ref.update({ lastSeen: new Date().toISOString() });
};

// --- FUNCIONÁRIOS (EMPLOYEES) ---
export const getEmployees = async (tenantId: string) => {
  const snap = await adminDb.collection('employees').where('tenantId', '==', tenantId).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getEmployeeById = async (matricula: string, tenantId: string) => {
  const snap = await adminDb.collection('employees').where('matricula', '==', matricula).where('tenantId', '==', tenantId).limit(1).get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as Employee;
};

export const addEmployee = async (data: any) => adminDb.collection('employees').add(data);
export const updateEmployee = async (id: string, data: any) => adminDb.collection('employees').doc(id).update(data);
export const deleteEmployee = async (id: string) => adminDb.collection('employees').doc(id).delete();

// --- PONTOS (PUNCHES) ---
export const addClockPunch = async (data: any) => adminDb.collection('punches').add({ ...data, timestamp: new Date().toISOString() });
export const getAllPunches = async (tenantId: string) => {
  const snap = await adminDb.collection('punches').where('tenantId', '==', tenantId).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const getPunchesForEmployee = async (matricula: string, tenantId: string) => {
  const snap = await adminDb.collection('punches').where('matricula', '==', matricula).where('tenantId', '==', tenantId).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- REGRAS, ESCALAS E SETORES (STUBS PARA O BUILD) ---
export const getRules = async (tenantId: string) => {
  const snap = await adminDb.collection('rules').where('tenantId', '==', tenantId).limit(1).get();
  return snap.empty ? {} : snap.docs[0].data();
};
export const updateRules = async (tenantId: string, data: any) => {
  const snap = await adminDb.collection('rules').where('tenantId', '==', tenantId).limit(1).get();
  return snap.empty ? adminDb.collection('rules').add({ ...data, tenantId }) : snap.docs[0].ref.update(data);
};
export const getLocations = async (tenantId: string) => (await adminDb.collection('locations').where('tenantId', '==', tenantId).get()).docs.map(d => ({ id: d.id, ...d.data() }));
export const addLocation = async (data: any) => adminDb.collection('locations').add(data);
export const updateLocation = async (id: string, data: any) => adminDb.collection('locations').doc(id).update(data);
export const deleteLocation = async (id: string) => adminDb.collection('locations').doc(id).delete();

// Funções genéricas para evitar erros de importação nos outros módulos
export const getScales = async (t: string) => [];
export const addScale = async (d: any) => {};
export const updateScale = async (id: string, d: any) => {};
export const deleteScale = async (id: string) => {};
export const getSchedules = async (t: string) => [];
export const addSchedule = async (d: any) => {};
export const updateSchedule = async (id: string, d: any) => {};
export const deleteSchedule = async (id: string) => {};
export const getSectors = async (t: string) => [];
export const addSector = async (d: any) => {};
export const updateSector = async (id: string, d: any) => {};
export const deleteSector = async (id: string) => {};
export const getRoles = async (t: string) => [];
export const addRole = async (d: any) => {};
export const updateRole = async (id: string, d: any) => {};
export const deleteRole = async (id: string) => {};
export const getHolidays = async (t: string) => [];
export const addHoliday = async (d: any) => {};
export const updateHoliday = async (id: string, d: any) => {};
export const deleteHoliday = async (id: string) => {};
export const getJustifications = async (t: string) => [];
export const addJustification = async (d: any) => {};
export const updateJustification = async (id: string, d: any) => {};
export const deleteJustification = async (id: string) => {};
export const getAfastamentos = async (t: string) => [];
export const addAfastamento = async (d: any) => {};
export const updateAfastamento = async (id: string, d: any) => {};
export const deleteAfastamento = async (id: string) => {};
export const updateUser = async (id: string, d: any) => {};
export const deleteUser = async (id: string) => {};