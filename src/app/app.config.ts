import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
// Import provideHttpClient
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()), // Add this line
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    importProvidersFrom(MatSnackBarModule),
    provideFunctions(() => {
      const functions = getFunctions();
      // Deployed functions by default. To test local functions, run the emulator and set
      // localStorage.useFunctionsEmulator = '1' in the browser console (remove it to switch back).
      let useEmulator = false;
      try {
        useEmulator = !environment.production && localStorage.getItem('useFunctionsEmulator') === '1';
      } catch {
        // storage unavailable: stay on deployed functions
      }
      if (useEmulator) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    }),

    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { dateFormat: 'dd/MM/yyyy' },
    },
    importProvidersFrom(MatNativeDateModule),
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
};
