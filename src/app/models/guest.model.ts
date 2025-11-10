import { BaseDocument } from './base-document.model';

export interface Pax {
  adult?: number;
  child?: number;
  infant?: number;
  total?: number;
}

export interface Guest extends BaseDocument {
  name: string;
  email?: string;
  tel?: string;
  fileRef?: string;
  remarks?: string;
  tourOperatorId: string;
  tourOperatorName: string;

  arrivalDate?: string;
  departureDate?: string;

  pax?: Pax;
}
