import { BaseDocument } from './base-document.model';
import { Timestamp } from '@angular/fire/firestore';
import { ItemCategory, UnitType } from './item.model';

export interface ProductValidity {
  from: Timestamp;
  to: Timestamp;
  price: number;
}

export interface Product extends BaseDocument {
  name: string;
  productCategory: ItemCategory;
  unitType: UnitType;
  partnerId: string;
  partnerName: string;

  validities?: ProductValidity[];

  vehicleCategoryId?: string;
  vehicleCategoryName?: string;

  itemIds?: string[]; // For linking multiple items if this is a bundle

  salesRepCommission?: number; // percentage
  toCommission?: number; // percentage
  creditCardCommission?: number; // percentage
}
