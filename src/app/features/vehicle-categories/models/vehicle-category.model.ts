import { BaseDocument } from 'src/app/core/models/base-document.model';

export interface VehicleCategory extends BaseDocument {
  name: string;
  capacity: number;
}
