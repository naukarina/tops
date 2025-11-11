import { Injectable } from '@angular/core';
import { SalesOrder } from '../models/sales-order.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class SalesOrderService extends BaseService<SalesOrder> {
  constructor() {
    super('sales-orders');
  }
}
