import { inject, Injectable } from '@angular/core';
import { BaseService } from '../../../core/services/base.service';
import { UserProfile } from '../../../core/models/user-profile.model';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class UserService extends BaseService<UserProfile> {
  private functions = inject(Functions);

  constructor() {
    super('users');
  }

  async createNewUser(userData: any, company: any, b2bMerchant?: any): Promise<void> {
    const createUserFn = httpsCallable(this.functions, 'createUser');

    // This single call handles both Auth and Firestore securely on the backend
    await createUserFn({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      companyType: company?.type ?? null,
      permissions: b2bMerchant ? {} : userData.permissions,
      b2bMerchant: b2bMerchant
        ? { id: b2bMerchant.id, externalMerchantId: b2bMerchant.externalMerchantId, name: b2bMerchant.name }
        : null,
      isActive: userData.isActive,
    });
  }
}
