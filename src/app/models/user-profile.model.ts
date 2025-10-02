// src/app/models/user-profile.model.ts
import { BaseDocument } from './base-document.model';

export interface UserProfile extends BaseDocument {
  name: string;
  email: string;
  roles: string[];
}
