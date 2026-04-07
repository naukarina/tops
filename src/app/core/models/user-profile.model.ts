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
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  permissions?: FeaturePermissions; // <-- ADD THIS
}
