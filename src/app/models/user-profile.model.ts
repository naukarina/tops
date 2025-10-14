// src/app/models/user-profile.model.ts
import { BaseDocument } from './base-document.model';
import { Company } from './company.model';

export interface UserProfile extends BaseDocument {
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
}
