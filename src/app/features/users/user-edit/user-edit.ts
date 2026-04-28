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
import { AppFeatureService } from '../../../core/services/app-feature.service';
import { AppFeature } from '../../../core/models/app-feature.model';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';

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
    MatDividerModule,
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

    const permissionsControls: Record<string, any> = {};

    try {
      const allFeatures = await firstValueFrom(this.featureService.getAll());
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

    // NOW that we have features, we build the form. The @if in HTML protects us until this point.
    this.userForm = this.fb.group({
      displayName: ['', Validators.required], // Updated field name
      email: ['', [Validators.required, Validators.email]],
      companyId: ['', Validators.required],
      permissions: this.fb.group(permissionsControls),
    });

    if (this.isEditMode) {
      this.userForm.get('email')?.disable();
      if (this.userId) {
        await this.loadUserData(this.userId);
      }
    }
  }

  private async loadUserData(id: string) {
    const user = await firstValueFrom(this.userService.get(id));
    if (user) {
      this.userForm.patchValue({
        ...user,
        permissions: user.permissions || {},
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.userForm || this.userForm.invalid) {
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    try {
      const formValue = this.userForm.getRawValue();
      const companies = await firstValueFrom(this.companies$);
      const selectedCompany = companies.find((c) => c.id === formValue.companyId);

      if (!selectedCompany) {
        this.notificationService.showError('Selected company not found.');
        return;
      }

      if (this.isEditMode && this.userId) {
        // Use displayName instead of name
        const updatedProfile: Partial<UserProfile> = {
          displayName: formValue.displayName,
          companyId: formValue.companyId,
          companyName: selectedCompany.name,
          companyType: selectedCompany.type,
          permissions: formValue.permissions,
        };
        await this.userService.update(this.userId, updatedProfile);
        this.notificationService.showSuccess('User updated successfully!');
      } else {
        // NOTE: If you implemented the Cloud Function `createUser` from earlier,
        // you might want to call `this.userService.createNewUser(formValue)` here instead!
        await this.authService.createUser(
          formValue.email,
          formValue.displayName, // Updated
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
