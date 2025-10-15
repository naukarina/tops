import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../services/notification.service';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  forgotPasswordForm: FormGroup;

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    const email = this.forgotPasswordForm.value.email;
    try {
      await this.authService.forgotPassword(email);
      this.notificationService.showSuccess('A password reset link has been sent to your email.');
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Password reset error:', error);
      this.notificationService.showError(error.message || 'Failed to send password reset email.');
    }
  }
}
