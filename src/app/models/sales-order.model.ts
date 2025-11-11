import { Timestamp } from '@angular/fire/firestore';
import { BaseDocument } from './base-document.model';
import { Currency } from './currency.model';

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  CANCELLED = 'CANCELLED',
}

export interface SalesOrder extends BaseDocument {
  // Order details
  orderNumber: number;
  status: SalesOrderStatus;

  // Partner details
  partnerName: string;
  partnerId: string;

  // Guest details
  guestName?: string;
  guestId?: string;
  fileRef?: string;
  tourOperatorId?: string;
  tourOperatorName?: string;
  guestArrivalDate?: Timestamp;
  guestDepartureDate?: Timestamp;
  guestArrivalLocation?: string;
  guestDepartureLocation?: string;

  // Order totals (Calculated by a function or on save)
  currency: Currency;
  totalPrice: number;

  remarks?: string;
}
