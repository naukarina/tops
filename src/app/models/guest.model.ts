import { BaseDocument } from './base-document.model';
import { Timestamp } from '@angular/fire/firestore';

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

  arrivalDate?: Timestamp;
  departureDate?: Timestamp;

  arrivalLocation?: string;
  departureLocation?: string;

  pax?: Pax;
}
