import { BaseDocument } from './base-document.model';

export enum CurrencyName {
  MUR = 'MUR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  ZAR = 'ZAR',
  AUD = 'AUD',
  CHF = 'CHF',
}

export interface Currency extends BaseDocument {
  name: CurrencyName;
  exchangeRate: number; // Exchange rate to MUR
  isActive: boolean; // Indicates if the currency is active for use
}
