import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService extends BaseService<Product> {
  constructor() {
    super('products');
  }
}
