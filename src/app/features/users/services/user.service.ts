import { Injectable } from '@angular/core';
import { BaseService } from '../../../core/services/base.service';
import { UserProfile } from '../../../core/models/user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserService extends BaseService<UserProfile> {
  constructor() {
    super('users');
  }
}
