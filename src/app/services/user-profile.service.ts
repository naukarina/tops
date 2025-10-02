// src/app/services/user-profile.service.ts
import { Injectable } from '@angular/core';
import { UserProfile } from '../models/user-profile.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService extends BaseService<UserProfile> {
  constructor() {
    super('user-profiles');
  }
}
