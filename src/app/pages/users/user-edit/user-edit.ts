import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

import { UserProfile } from '../../../models/user-profile.model';
import { Company } from '../../../models/company.model';

import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../services/user.service';
import { CompanyService } from '../../../services/company.service';
import { NotificationService } from '../../../services/notification.service';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    EditPageComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './user-edit.html',
})
export class UserEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private companyService = inject(CompanyService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  userForm!: FormGroup;
  isEditMode = false;
  private userId: string | null = null;
  companies$!: Observable<Company[]>;

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.userId;
    this.companies$ = this.companyService.getAll();

    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      companyId: ['', Validators.required],
    });

    if (this.isEditMode) {
      this.userForm.get('email')?.disable(); // Prevent email change in edit mode
      if (this.userId) {
        this.loadUserData(this.userId);
      }
    }
  }

  private async loadUserData(id: string) {
    const user = await firstValueFrom(this.userService.get(id));
    if (user) {
      this.userForm.patchValue(user);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    try {
      const formValue = this.userForm.getRawValue(); // Use getRawValue for disabled fields
      const companies = await firstValueFrom(this.companies$);
      const selectedCompany = companies.find((c) => c.id === formValue.companyId);

      if (!selectedCompany) {
        this.notificationService.showError('Selected company not found.');
        return;
      }

      if (this.isEditMode && this.userId) {
        // Update existing user's Firestore profile
        const updatedProfile: Partial<UserProfile> = {
          name: formValue.name,
          companyId: formValue.companyId,
          companyName: selectedCompany.name,
          companyType: selectedCompany.type,
        };
        await this.userService.update(this.userId, updatedProfile);
        this.notificationService.showSuccess('User updated successfully!');
      } else {
        // Create a new user (Auth and Firestore)
        await this.authService.createUser(
          formValue.email,
          formValue.name,
          formValue.companyId,
          selectedCompany.name,
          selectedCompany.type
        );
        this.notificationService.showSuccess('User created successfully!');
      }
      this.router.navigate(['/users']);
    } catch (error: any) {
      console.error('Error saving user:', error);
      this.notificationService.showError(error.message || 'Failed to save user.');
    }
  }
}
