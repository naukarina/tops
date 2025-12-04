import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Item } from '../models/item.model';

@Injectable({
  providedIn: 'root',
})
export class ItemService extends BaseService<Item> {
  constructor() {
    super('items');
  }
}
