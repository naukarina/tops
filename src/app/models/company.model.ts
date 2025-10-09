import { BaseDocument } from './base-document.model';

export enum CompanyType {
  PLANNING = 'PLANNING',
  DMC = 'DMC',
  SUB_DMC = 'SUB_DMC',
}

export interface Company extends BaseDocument {
  name: string;
  type: CompanyType;
  companySettings?: {
    dmcId?: string; // For SUB_DMC type, link to parent DMC
    planningCompanyId?: string; // For DMC/SUB_DMC type, link to planning company
    accessType?: 'FULL' | 'RESTRICTED'; // Access type for DMC/SUB_DMC
  };
}
