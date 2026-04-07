import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { PermissionService } from './permission.service';
import { AccessLevel } from '../models/user-profile.model';
import { NotificationService } from '../services/notification.service';

// This is a factory function that returns a CanActivateFn
export const featureGuard = (feature: string, requiredLevel: AccessLevel): CanActivateFn => {
  return () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);
    const notification = inject(NotificationService); // Optional: to show a toast

    return permissionService.hasAccess(feature, requiredLevel).pipe(
      take(1),
      map((isAuthorized) => {
        if (isAuthorized) return true;

        notification.showError("You don't have permission to access this page.");
        return router.parseUrl('/home'); // Redirect unauthorized users to home
      }),
    );
  };
};
