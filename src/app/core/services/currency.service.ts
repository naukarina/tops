import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Currency } from '../models/currency.model';

@Injectable({ providedIn: 'root' })
export class CurrencyService extends BaseService<Currency> {
  constructor() {
    super('currencies');
  }
}
