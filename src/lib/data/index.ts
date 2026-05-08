// This file is deprecated. All data logic has been moved to client-side components
// using the Firebase SDK for a 100% client-side architecture.

// ======================================================
// COMPANY
// ======================================================

export interface Company {

  id: string;

  tenantId?: string;

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

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// USER
// ======================================================

export interface User {

  id?: string;

  uid: string;

  tenantId?: string;

  name: string;

  email: string;

  role:
    | 'master'
    | 'admin'
    | 'rh'
    | 'gestor'
    | 'funcionario';

  accessLevel?: string;

  status: 'Ativo' | 'Inativo';

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// EMPLOYEE
// ======================================================

export interface Employee {

  id?: string;

  uid?: string;

  tenantId: string;

  matricula: string;

  name: string;

  email: string;

  password?: string;

  cpf: string;

  celular?: string;

  role: string;

  accessLevel?: string;

  setor?: string;

  localTrabalho?: string;

  scheduleId?: string;

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

  createdAt?: string;

  updatedAt?: string;

  isFirstAdmin?: boolean;
}

// ======================================================
// DEVICE
// ======================================================

export interface Device {

  id: string;

  tenantId?: string;

  description: string;

  nickname: string;

  model:
    | "iDClass - REP-C"
    | "iDClass - REP-TE"
    | "Outro";

  serialNumber: string;

  ipAddress: string;

  port: number;

  protocol:
    | "HTTPS"
    | "HTTP";

  repUsername: string;

  repPassword?: string;

  location_building?: string;

  location_floor?: number;

  location_area?: string;

  syncFrequency:
    | "every_10_min"
    | "every_30_min"
    | "hourly";

  status: 'Online' | 'Offline';

  lastSeen?: string;

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// SECTOR
// ======================================================

export interface Sector {

  id: string;

  tenantId?: string;

  name: string;

  description: string;

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// ROLE
// ======================================================

export interface Role {

  id: string;

  tenantId?: string;

  name: string;

  description: string;

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// DAY SCHEDULE
// ======================================================

export interface DaySchedule {

  dayOfWeek: number;

  name: string;

  isDayOff: boolean;

  entry1?: string;

  exit1?: string;

  entry2?: string;

  exit2?: string;
}

// ======================================================
// SCHEDULE
// ======================================================

export interface Schedule {

  id: string;

  tenantId?: string;

  name: string;

  workWeek: DaySchedule[];

  automaticInterval?: boolean;

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// SCALE
// ======================================================

export interface Scale {

  id: string;

  tenantId?: string;

  name: string;

  type:
    | '12x36'
    | '5x1'
    | '6x1';

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// LOCATION
// ======================================================

export interface Location {

  id: string;

  tenantId?: string;

  name: string;

  address: string;

  latitude?: number;

  longitude?: number;

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// CLOCK PUNCH
// ======================================================

export interface ClockPunch {

  id?: string;

  tenantId: string;

  employeeId: string;

  deviceId?: string;

  timestamp: string;

  type:
    | 'Entrada'
    | 'SaidaAlmoco'
    | 'EntradaAlmoco'
    | 'Saída';

  location?: {
    latitude: number;
    longitude: number;
  };

  locationName?: string;

  justification?: string;

  isLocationAnomaly?: boolean;

  actualLatitude?: number;

  actualLongitude?: number;

  createdAt?: string;
}

// ======================================================
// JUSTIFICATION
// ======================================================

export interface Justification {

  id: string;

  tenantId?: string;

  name: string;

  description: string;

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// HOLIDAY
// ======================================================

export interface Holiday {

  id: string;

  date: string;

  name: string;

  type:
    | 'Nacional'
    | 'Local'
    | 'Facultativo';

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// AFASTAMENTO
// ======================================================

export interface Afastamento {

  id: string;

  tenantId?: string;

  employeeId: string;

  tipo:
    | 'Férias'
    | 'Licença Maternidade'
    | 'Acidente/Atestado'
    | 'Afastado INSS'
    | 'Licença Médica'
    | 'Outros';

  startDate: string;

  endDate: string;

  description?: string;

  status:
    | 'Ativo'
    | 'Cancelado';

  createdAt?: string;

  updatedAt?: string;
}

// ======================================================
// RULES
// ======================================================

export interface Rules {

  showCalculationsInReport: boolean;

  nightShiftStart: string;

  nightShiftEnd: string;

  overtime: {

    weekday: {
      firstHours: string;
      percentage: number;
    };

    saturday: {
      firstHours: string;
      percentage: number;
    };

    holidayAndDayOff: {
      percentage: number;
    };
  };

  additionalBreak: {

    enabled: boolean;

    duration: string;
  };

  tardinessTolerance: {

    rule:
      | "tenMinutesDaily"
      | "none";
  };
}

// ======================================================
// SUPPORT SETTINGS
// ======================================================

export interface SupportSettings {

  whatsappNumber: string;

  widgetEnabled: boolean;
}

// ======================================================
// COMPANY INFO
// ======================================================

export type CompanyInfo = Omit<
  Company,
  | 'id'
  | 'status'
  | 'paymentStatus'
  | 'plan'
  | 'paymentDay'
>;