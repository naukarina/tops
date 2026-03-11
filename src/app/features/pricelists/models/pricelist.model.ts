import { BaseDocument } from '../../../core/models/base-document.model';

export interface PricelistProduct {
  baseProductId: string;
  displayName: string;
  price: number;
}

export interface PricelistPeriod {
  validityFrom: any; // Using 'any' to accommodate both JS Date and Firebase Timestamp
  validityTo: any;
  pricelistProducts: PricelistProduct[];
}

export interface Pricelist extends BaseDocument {
  name: string;
  tourOperatorIds: string[];
  currencyName: string;
  periods: PricelistPeriod[];
}
