import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';

// 1. Import MAT_DATE_LOCALE
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    importProvidersFrom(MatSnackBarModule),
    provideFunctions(() => getFunctions()),

    // Default DatePipe format (for lists/text)
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { dateFormat: 'dd/MM/yyyy' },
    },

    // Provide NativeDateAdapter
    importProvidersFrom(MatNativeDateModule),

    // 2. Set the Locale to 'en-GB' to force DD/MM/YYYY in Datepickers
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
};
