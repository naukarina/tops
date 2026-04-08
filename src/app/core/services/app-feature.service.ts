import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { AppFeature } from '../models/app-feature.model';

@Injectable({ providedIn: 'root' })
export class AppFeatureService extends BaseService<AppFeature> {
  constructor() {
    super('features');
  }
}
