import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

import { UserProfile, AccessLevel } from '../../../core/models/user-profile.model';
import { Company } from '../../../core/models/company.model';

import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../services/user.service';
import { CompanyService } from '../../../core/services/company.service';
import { NotificationService } from '../../../core/services/notification.service';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider'; // Added for the UI separator
import { AppFeatureService } from '@core/services/app-feature.service';
import { AppFeature } from '@core/models/app-feature.model';

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
    MatDividerModule, // Added
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
  private featureService = inject(AppFeatureService);

  userForm!: FormGroup;
  isEditMode = false;
  private userId: string | null = null;
  companies$!: Observable<Company[]>;

  appFeatures: AppFeature[] = [];

  // 2. Define the available access levels
  accessLevels: { value: AccessLevel; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'readonly', label: 'Read Only' },
    { value: 'user', label: 'User (Write)' },
    { value: 'admin', label: 'Admin' },
  ];

  async ngOnInit(): Promise<void> {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.userId;
    this.companies$ = this.companyService.getAll();

    // 3. Dynamically build the permissions group controls with 'none' as default
    const permissionsControls: Record<string, any> = {};
    // 1. Fetch the active features from Firestore first
    try {
      const allFeatures = await firstValueFrom(this.featureService.getAll());
      // Optional: Filter only active features and sort them by order or label
      this.appFeatures = allFeatures
        .filter((f) => f.isActive !== false)
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
      console.error('Failed to load features', error);
      this.notificationService.showError('Could not load system features.');
    }

    this.appFeatures.forEach((feature) => {
      permissionsControls[feature.key] = ['none'];
    });

    // 4. Initialize the form with the nested permissions group
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      companyId: ['', Validators.required],
      permissions: this.fb.group(permissionsControls), // <-- Added
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
      // 5. Patch the form. This will automatically fill the nested permissions group
      // if the user document already has a permissions object.
      this.userForm.patchValue({
        ...user,
        permissions: user.permissions || {},
      });
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
          permissions: formValue.permissions, // <-- 6. Save permissions to Firestore
        };
        await this.userService.update(this.userId, updatedProfile);
        this.notificationService.showSuccess('User updated successfully!');
      } else {
        // Create a new user (Auth and Firestore)
        // Note: You may need to update your authService.createUser method if you want
        // to pass `formValue.permissions` directly during the initial creation step.
        await this.authService.createUser(
          formValue.email,
          formValue.name,
          formValue.companyId,
          selectedCompany.name,
          selectedCompany.type,
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
