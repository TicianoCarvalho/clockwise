import { adminDb } from './firebase-admin-config';

// --- INTERFACES ---

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  planLimit?: number;
  status?: string;
  plan?: 'soft' | 'plus' | 'prime';
  paymentDay?: number;
}

export interface Sector {
  id: string;
  name: string;
}

export interface Schedule {
  id: string;
  name: string;
}

export interface Scale {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
  tenantId: string;
  latitude?: number;
  longitude?: number;
  radius?: number; 
}

export interface Employee {
  id?: string;
  matricula: string;
  name: string;
  cpf: string;
  email?: string;
  tenantId: string;
  branchId?: string;
  setor?: string;
  scheduleId?: string;
  scaleId?: string | null;
  admissionDate: string;        
  terminationDate?: string | null;
  birthDate?: string | null;
  phone?: string;                
  eSocialId?: string;            
  automaticInterval: boolean;   
  allowMobilePunch: boolean;    
  address?: string;             
  avatarUrl?: string;           
  status: 'Ativo' | 'Inativo';
  workModel?: 'standard' | 'hourly';
}

// --- BUSCAS GLOBAIS (Root Collections) ---

export const getSchedules = async () => {
  const snap = await adminDb.collection('schedules').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Schedule[];
};

export const getSectors = async () => {
  const snap = await adminDb.collection('sectors').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sector[];
};

export const getScales = async () => {
  const snap = await adminDb.collection('scales').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Scale[];
};

// --- FILIAIS (BRANCHES) ---
export const getBranches = async (tenantId: string) => {
  const snap = await adminDb.collection('branches').where('tenantId', '==', tenantId).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
};

// --- LOCAIS DE MARCAÇÃO (LOCATIONS) ---
export const getLocations = async (tenantId: string) => {
  const snap = await adminDb.collection('tenants').doc(tenantId).collection('locations').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Location[];
};

// --- FUNCIONÁRIOS (EMPLOYEES) ---

export const getEmployees = async (tenantId: string) => {
  const snap = await adminDb
    .collection('tenants')
    .doc(tenantId)
    .collection('employees')
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
};

export const addEmployee = async (tenantId: string, data: Partial<Employee>) => {
  const docId = data.cpf ? data.cpf.replace(/\D/g, "") : undefined;
  
  if (docId) {
    return adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('employees')
      .doc(docId)
      .set({
        ...data,
        createdAt: new Date().toISOString()
      });
  }
  
  return adminDb.collection('tenants').doc(tenantId).collection('employees').add(data);
};

export const updateEmployee = async (tenantId: string, employeeId: string, data: Partial<Employee>) => {
  return adminDb
    .collection('tenants')
    .doc(tenantId)
    .collection('employees')
    .doc(employeeId)
    .update({
      ...data,
      updatedAt: new Date().toISOString()
    });
};

// --- MARCAÇÕES DE PONTO (PUNCHES) ---

export const addPunch = async (tenantId: string, employeeId: string, punchData: any) => {
  return adminDb
    .collection('tenants')
    .doc(tenantId)
    .collection('employees')
    .doc(employeeId)
    .collection('punches')
    .add({
      ...punchData,
      serverTimestamp: new Date().toISOString()
    });
};

export const getTodayPunches = async (tenantId: string, employeeId: string) => {
  const today = new Date().toISOString().split('T')[0]; 
  const snap = await adminDb
    .collection('tenants')
    .doc(tenantId)
    .collection('employees')
    .doc(employeeId)
    .collection('punches')
    .where('date', '==', today)
    .orderBy('serverTimestamp', 'asc')
    .get();
    
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};