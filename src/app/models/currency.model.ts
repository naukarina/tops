import { BaseDocument } from './base-document.model';

export interface Currency extends BaseDocument {
  name: string;
  exchangeRate: number; // Exchange rate to MUR
  isActive: boolean; // Indicates if the currency is active for use
}
