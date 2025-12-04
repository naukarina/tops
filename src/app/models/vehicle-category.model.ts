import { BaseDocument } from './base-document.model';

export interface VehicleCategory extends BaseDocument {
  name: string;
  capacity: number;
}
