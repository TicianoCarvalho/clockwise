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
  branchId?: string; // Novo: Vínculo do funcionário com a filial específica
}

// ... (Mantenha as funções de suporte e suporte_settings como estão)

// --- FILIAIS (BRANCHES) ---
// Nova seção para gerenciar os dados fiscais completos
export const getBranches = async (tenantId: string) => {
  const snap = await adminDb.collection('branches').where('tenantId', '==', tenantId).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addBranch = async (data: any) => adminDb.collection('branches').add(data);
export const updateBranch = async (id: string, data: any) => adminDb.collection('branches').doc(id).update(data);
export const deleteBranch = async (id: string) => adminDb.collection('branches').doc(id).delete();

// --- LOCAIS DE MARCAÇÃO (LOCATIONS) ---
// Atualizado para suportar o vínculo com uma filial
export const getLocations = async (tenantId: string) => {
  const snap = await adminDb.collection('locations').where('tenantId', '==', tenantId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addLocation = async (data: any) => {
  // O dado aqui deve conter branchId para vincular ao CNPJ correto
  return adminDb.collection('locations').add(data);
};

// ... (Mantenha as funções de dispositivos e funcionários)