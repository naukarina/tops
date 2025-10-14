import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { UserProfile } from '../models/user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserService extends BaseService<UserProfile> {
  constructor() {
    super('users');
  }
}
