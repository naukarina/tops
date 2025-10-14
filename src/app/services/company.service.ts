import { Injectable, inject } from '@angular/core';
import { Company } from '../models/company.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class CompanyService extends BaseService<Company> {
  constructor() {
    super('companies');
  }
}
