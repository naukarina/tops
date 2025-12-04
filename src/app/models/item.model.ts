import { BaseDocument } from './base-document.model';
import { Timestamp } from '@angular/fire/firestore';

export enum ItemCategory {
  AIRPORT_TRANSFER = 'AIRPORT TRANSFER',
  INTER_HOTEL_TRANSFER = 'INTER HOTEL TRANSFER',
  EXCURSION_TRANSFER = 'EXCURSION TRANSFER',
  EXCURSION = 'EXCURSION',
  CAR_RENTAL = 'CAR RENTAL',
  RODRIGUES = 'RODRIGUES',
  SHUTTLE = 'SHUTTLE',
  WEDDING = 'WEDDING',
  TRAVELING_STAFF = 'TRAVELING_STAFF',
  ELSE = 'ELSE',
}

export enum UnitType {
  ADULT = 'ADULT',
  INFANT = 'INFANT',
  CHILD = 'CHILD',
  UNIT = 'UNIT',
}

export interface ItemValidity {
  from: Timestamp;
  to: Timestamp;
  cost: number;
}

export interface Item extends BaseDocument {
  name: string;
  itemCategory: ItemCategory;
  unitType: UnitType;
  partnerId: string;
  partnerName: string;
  validities?: ItemValidity[];
  vehicleCategoryId?: string;
  vehicleCategoryName?: string;
  virtual: boolean;
}
