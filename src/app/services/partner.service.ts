// src/app/services/partner.service.ts
import { Injectable } from '@angular/core';
import { Partner } from '../models/partner.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class PartnerService extends BaseService<Partner> {
  constructor() {
    super('partners');
  }
}
