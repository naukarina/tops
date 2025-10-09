// src/app/core/auth/auth-guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Use the authState observable to asynchronously check the user's login status.
  // This waits for Firebase to initialize and determine if a user session exists.
  return authState(auth).pipe(
    take(1), // Take the first emitted value to prevent the guard from running indefinitely.
    map((user) => {
      // If a user object exists, they are authenticated.
      if (user) {
        return true;
      }

      // If no user exists, redirect to the login page.
      return router.parseUrl('/login');
    })
  );
};
