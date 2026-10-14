// src/app/core/auth/auth-guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { UserProfileService } from './user-profile.service';

export const B2B_HOME = '/b2b-pricing';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const userProfileService = inject(UserProfileService);

  // Use the authState observable to asynchronously check the user's login status.
  // This waits for Firebase to initialize and determine if a user session exists.
  return authState(auth).pipe(
    take(1), // Take the first emitted value to prevent the guard from running indefinitely.
    switchMap((user) => {
      // If no user exists, redirect to the login page.
      if (!user) {
        return of(router.parseUrl('/login'));
      }

      // B2B partner accounts are confined to the B2B pricing module.
      return userProfileService.userProfile$.pipe(
        take(1),
        map((profile) => {
          const isB2b = profile?.b2bMerchantId != null;
          const onB2bRoute = state.url.split('?')[0].startsWith(B2B_HOME);
          if (isB2b && !onB2bRoute) {
            return router.parseUrl(B2B_HOME);
          }
          return true;
        }),
      );
    }),
  );
};

// Only B2B partner accounts may open the B2B pricing module.
export const b2bGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(UserProfileService).userProfile$.pipe(
    take(1),
    map((profile) => (profile?.b2bMerchantId != null ? true : router.parseUrl('/home'))),
  );
};
