import { Injectable } from '@angular/core';
import { BaseService } from '../../../core/services/base.service';
import { Pricelist } from '../models/pricelist.model';

@Injectable({
  providedIn: 'root',
})
export class PricelistService extends BaseService<Pricelist> {
  constructor() {
    super('pricelists');
  }
}
