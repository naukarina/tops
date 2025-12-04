import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { VehicleCategory } from '../models/vehicle-category.model';

@Injectable({
  providedIn: 'root',
})
export class VehicleCategoryService extends BaseService<VehicleCategory> {
  constructor() {
    super('vehicle-categories');
  }
}
