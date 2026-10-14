import { BaseDocument } from './base-document.model';

// 1. Define the possible access levels
export type AccessLevel = 'none' | 'readonly' | 'user' | 'admin';

// 2. Assign numeric weights so we can easily check if a user has "at least" a certain level
export const AccessLevelWeight: Record<AccessLevel, number> = {
  none: 0,
  readonly: 1,
  user: 2,
  admin: 3,
};

// 3. Define the permissions dictionary
export interface FeaturePermissions {
  [featureName: string]: AccessLevel;
}

export interface UserProfile extends BaseDocument {
  displayName: string;
  email: string;
  roles: string[];
  isActive: boolean;
  permissions?: FeaturePermissions; // <-- ADD THIS
  // B2B partner accounts: bound to one Kreola merchant and limited to the B2B pricing module.
  // Set by the createUser cloud function; the b2b* proxies read the binding from this doc.
  b2bMerchantId?: number | null;
  b2bExternalMerchantId?: string | null;
  b2bMerchantName?: string | null;
}
