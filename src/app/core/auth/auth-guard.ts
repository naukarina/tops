import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    map((user) => {
      if (user) {
        return true; // If user is logged in, allow access
      }
      // If user is not logged in, redirect to the login page
      router.navigate(['/login']);
      return false;
    })
  );
};
