import { BaseDocument } from './base-document.model';

export enum CompanyType {
  PLANNING = 'PLANNING',
  DMC = 'DMC',
}

export interface Company extends BaseDocument {
  name: string;
  type: CompanyType;
  subDmcs?: string[];
  accessType?: 'FULL' | 'RESTRICTED'; // Access type for DMC
  planningCompanyId?: string; // Reference to the planning company if type is DMC
  vat?: number;
}
