import { BaseDocument } from '../../../core/models/base-document.model';

export interface PricelistProduct {
  baseProductId: string;
  displayName: string;
  price: number;
}

export interface Pricelist extends BaseDocument {
  name: string;
  validityFrom: any; // Using 'any' to accommodate both JS Date and Firebase Timestamp
  validityTo: any;
  tourOperatorIds: string[];
  currencyName: string;
  pricelistProducts: PricelistProduct[];
}
