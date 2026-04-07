import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { UserProfileService } from './user-profile.service';
import { AccessLevel, AccessLevelWeight } from '../models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private userProfileService = inject(UserProfileService);

  /**
   * Checks if the current user has AT LEAST the required access level for a feature.
   */
  hasAccess(feature: string, requiredLevel: AccessLevel): Observable<boolean> {
    return this.userProfileService.userProfile$.pipe(
      map((profile) => {
        // If no profile or no permissions, default to 'none'
        if (!profile || !profile.permissions) return false;

        const userLevelStr = profile.permissions[feature] || 'none';

        // Compare the numeric weights
        const userWeight = AccessLevelWeight[userLevelStr];
        const requiredWeight = AccessLevelWeight[requiredLevel];

        return userWeight >= requiredWeight;
      }),
    );
  }
}
