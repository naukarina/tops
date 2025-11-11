import { Timestamp } from '@angular/fire/firestore';
import { BaseDocument } from './base-document.model';
import { CurrencyName } from './currency.model'; // Removed unused 'Currency'

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  CANCELLED = 'CANCELLED',
}

export enum SalesOrderCategory {
  RESERVATIONS = 'RESERVATIONS',
  SALESREP = 'SALESREP',
  B2B = 'B2B',
}

export interface SalesOrder extends BaseDocument {
  // Order details
  orderNumber: number;
  status: SalesOrderStatus;
  category: SalesOrderCategory;

  // Partner details
  partnerName: string;
  partnerId: string;

  // Guest details
  guestName: string | null; // <-- MODIFIED
  guestId: string | null; // <-- MODIFIED
  fileRef: string | null; // <-- MODIFIED
  tourOperatorId: string | null; // <-- MODIFIED
  tourOperatorName: string | null; // <-- MODIFIED
  guestArrivalDate: Timestamp | null; // <-- MODIFIED
  guestDepartureDate: Timestamp | null; // <-- MODIFIED
  guestArrivalLocation: string | null; // <-- MODIFIED
  guestDepartureLocation: string | null; // <-- MODIFIED

  // Order totals (Calculated by a function or on save)
  currencyName: CurrencyName;
  totalPrice: number;

  remarks: string | null; // <-- MODIFIED
}
