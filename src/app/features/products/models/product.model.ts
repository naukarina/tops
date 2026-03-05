import { BaseDocument } from 'src/app/core/models/base-document.model';
import { Timestamp } from '@angular/fire/firestore';
import { ItemCategory, UnitType, TransferType } from '../../items/models/item.model';

export interface ProductValidity {
  from: Timestamp;
  to: Timestamp;
  price: number;
}

export interface Product extends BaseDocument {
  name: string;
  productCategory: ItemCategory;
  unitType: UnitType;
  transferType: TransferType;

  validities?: ProductValidity[];

  vehicleCategoryId?: string;
  vehicleCategoryName?: string;

  itemIds?: string[]; // For linking multiple items if this is a bundle

  salesRepCommission?: number; // percentage
  toCommission?: number; // percentage
  creditCardCommission?: number; // percentage
}
