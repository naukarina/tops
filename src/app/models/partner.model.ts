import { BaseDocument } from './base-document.model';
import { CurrencyName } from './currency.model';
import { Region } from './location.model';

export enum PartnerType {
  HOTEL = 'HOTEL',
  TOUR_OPERATOR = 'TOUR_OPERATOR',
  SUPPLIER = 'SUPPLIER',
  SALES_REP = 'SALES_REP',
}

export interface Partner extends BaseDocument {
  name: string;
  type: PartnerType;
  contactInfo?: {
    email: string;
    tel: string;
    tel2: string;
    address: string;
    zip: string;
    town: string;
    country: string;
  };
  taxinfo?: {
    brn: string;
    isVatRegistered: boolean;
    vatNumber?: string;
  };
  currencyName: CurrencyName;
  remarks?: string;
  hotelInfo?: {
    starRating?: number;
    region?: Region;
  };
  isActive: boolean;
  companyId: string; // Assigned automatically based on the user creating the partner
  subDmc?: string;
}
