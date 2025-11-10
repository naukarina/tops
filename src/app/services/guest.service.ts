import { Injectable } from '@angular/core';
import { Guest } from '../models/guest.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class GuestService extends BaseService<Guest> {
  constructor() {
    super('guests');
  }
}
