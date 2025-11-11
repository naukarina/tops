import { BaseDocument } from './base-document.model';
import { Timestamp } from '@angular/fire/firestore';

export interface Pax {
  adult: number | null; // <-- MODIFIED
  child: number | null; // <-- MODIFIED
  infant: number | null; // <-- MODIFIED
  total: number | null; // <-- MODIFIED
}

export interface Guest extends BaseDocument {
  name: string;
  email: string | null; // <-- MODIFIED
  tel: string | null; // <-- MODIFIED
  fileRef: string | null; // <-- MODIFIED
  remarks: string | null; // <-- MODIFIED
  tourOperatorId: string;
  tourOperatorName: string;

  arrivalDate: Timestamp | null; // <-- MODIFIED
  departureDate: Timestamp | null; // <-- MODIFIED

  arrivalLocation: string | null; // <-- MODIFIED
  departureLocation: string | null; // <-- MODIFIED

  pax: Pax | null; // <-- MODIFIED
}
