import { adminDb } from './firebase-admin-config';

// --- INTERFACES ATUALIZADAS ---
export interface Branch {
  id?: string;
  tenantId: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
}

export interface Employee {
  id?: string;
  matricula: string;
  name: string;
  cpf: string;
  email?: string;
  tenantId: string;
  branchId?: string;
  
  // --- CAMPOS RECUPERADOS (O que estava faltando) ---
  admissionDate: string;        // Data de admissão
  resignationDate?: string;     // Data de rescisão
  phone?: string;               // Celular/WhatsApp
  eSocialId?: string;           // Cadastro eSocial
  automaticInterval: boolean;   // Marcação automática no intervalo
  allowMobilePunch: boolean;    // Localização do ponto / Permissão mobile
  address?: string;             // Endereço completo
  avatarUrl?: string;           // Foto do perfil (Base64 ou URL)
}

// --- FILIAIS (BRANCHES) ---
export const getBranches = async (tenantId: string) => {
  const snap = await adminDb.collection('branches').where('tenantId', '==', tenantId).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addBranch = async (data: any) => adminDb.collection('branches').add(data);
export const updateBranch = async (id: string, data: any) => adminDb.collection('branches').doc(id).update(data);
export const deleteBranch = async (id: string) => adminDb.collection('branches').doc(id).delete();

// --- LOCAIS DE MARCAÇÃO (LOCATIONS) ---
export const getLocations = async (tenantId: string) => {
  const snap = await adminDb.collection('locations').where('tenantId', '==', tenantId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addLocation = async (data: any) => {
  return adminDb.collection('locations').add(data);
};

// --- FUNCIONÁRIOS (EMPLOYEES) ---
// Função atualizada para garantir que o front-end receba os novos campos
export const getEmployees = async (tenantId: string) => {
  const snap = await adminDb.collectionGroup('employees')
    .where('tenantId', '==', tenantId)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
};

export const addEmployee = async (tenantId: string, data: any) => {
  return adminDb.collection('tenants').doc(tenantId).collection('employees').add(data);
};

export const updateEmployee = async (tenantId: string, employeeId: string, data: any) => {
  return adminDb.collection('tenants').doc(tenantId).collection('employees').doc(employeeId).update(data);
};