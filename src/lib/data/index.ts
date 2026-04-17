// This file is deprecated. All data logic has been moved to client-side components
// using the Firebase SDK for a 100% client-side architecture.

// --- Tipos de Dados ---
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  ie?: string;
  cei?: string;
  city?: string;
  state?: string;
  plan?: 'soft' | 'plus' | 'prime';
  status?: 'Ativa' | 'Inativa';
  paymentStatus?: 'Em dia' | 'Atrasado';
  paymentDay?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Ativo' | 'Inativo';
  password?: string;
}

export interface Employee {
  id: string;
  matricula: string;
  name:string;
  email: string;
  password?: string;
  cpf: string;
  celular: string;
  role: string;
  setor: string;
  localTrabalho: string;
  scheduleId: string;
  scaleId?: string;
  scaleStartDate?: string;
  status: 'Ativo' | 'Inativo';
  avatarUrl?: string;
  faceLandmarks?: string;
  allowMobilePunch?: boolean;
  automaticInterval?: boolean;
  workModel?: 'standard' | 'hourly';
  esocialMatricula?: string;
  admissionDate?: string;
  birthDate?: string;
  terminationDate?: string;
  address?: string;
}

export interface Device {
  id: string;
  description: string;
  nickname: string;
  model: "iDClass - REP-C" | "iDClass - REP-TE" | "Outro";
  serialNumber: string;
  ipAddress: string;
  port: number;
  protocol: "HTTPS" | "HTTP";
  repUsername: string;
  repPassword?: string;
  location_building?: string;
  location_floor?: number;
  location_area?: string;
  syncFrequency: "every_10_min" | "every_30_min" | "hourly";
  status: 'Online' | 'Offline';
  lastSeen?: string;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
}

export interface DaySchedule {
    dayOfWeek: number;
    name: string;
    isDayOff: boolean;
    entry1?: string;
    exit1?: string;
    entry2?: string;
    exit2?: string;
}

export interface Schedule {
    id: string;
    name: string;
    workWeek: DaySchedule[];
    automaticInterval?: boolean;
}

export interface Scale {
  id: string;
  name: string;
  type: '12x36' | '5x1' | '6x1';
}

export interface Location {
    id: string;
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
}

export interface ClockPunch {
    deviceId?: string;
    employeeId: string;
    timestamp: string; 
    type: 'Entrada' | 'SaidaAlmoco' | 'EntradaAlmoco' | 'Saída';
    location: {
        latitude: number;
        longitude: number;
    };
    locationName?: string;
    justification?: string;
    isLocationAnomaly?: boolean;
    actualLatitude?: number;
    actualLongitude?: number;
}

export interface Justification {
  id: string;
  name: string;
  description: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'Nacional' | 'Local' | 'Facultativo';
}

export interface Afastamento {
  id: string;
  employeeId: string;
  tipo: 'Férias' | 'Licença Maternidade' | 'Acidente/Atestado' | 'Afastado INSS' | 'Licença Médica' | 'Outros';
  startDate: string;
  endDate: string;
  description?: string;
  status: 'Ativo' | 'Cancelado';
}

export interface Rules {
  showCalculationsInReport: boolean;
  nightShiftStart: string;
  nightShiftEnd: string;
  overtime: {
    weekday: { firstHours: string; percentage: number; };
    saturday: { firstHours: string; percentage: number; };
    holidayAndDayOff: { percentage: number; };
  };
  additionalBreak: { enabled: boolean; duration: string; };
  tardinessTolerance: { rule: "tenMinutesDaily" | "none"; };
}

export interface SupportSettings {
  whatsappNumber: string;
  widgetEnabled: boolean;
}

export type CompanyInfo = Omit<Company, 'id' | 'status' | 'paymentStatus' | 'plan' | 'paymentDay'>;
