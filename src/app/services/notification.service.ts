// src/app/services/notification.service.ts

import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000, // Show for 5 seconds
      panelClass: ['error-snackbar'], // Optional: for custom styling
    });
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }
}
