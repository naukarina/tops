import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { AccommodationService } from '../../accommodations/services/accommodation.service';

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
    MatSlideToggleModule,
    NgxMatSelectSearchModule,
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
  private accommodationService = inject(AccommodationService);

  userForm!: FormGroup;
  isEditMode = false;
  private userId: string | null = null;
  companies$!: Observable<Company[]>;

  appFeatures: AppFeature[] = [];

  // B2B partner accounts: bound to one merchant from the Kreola merchant list
  merchants: any[] = [];
  filteredMerchants: any[] = [];
  merchantSearchCtrl = new FormControl('');
  merchantsLoading = false;
  private merchantsReady: Promise<void> = Promise.resolve();

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
      isB2b: [false],
      b2bMerchant: [null],
      companyId: ['', Validators.required],
      permissions: this.fb.group(permissionsControls),
    });

    this.userForm.get('isB2b')!.valueChanges.subscribe((isB2b) => this.applyB2bValidators(isB2b));
    this.merchantSearchCtrl.valueChanges.subscribe((search) => {
      const q = (search ?? '').toLowerCase();
      this.filteredMerchants = this.merchants.filter((m) => m.name.toLowerCase().includes(q));
    });
    this.merchantsReady = this.loadMerchants();

    if (this.isEditMode) {
      this.userForm.get('email')?.disable();
      if (this.userId) {
        await this.loadUserData(this.userId);
      }
    }
  }

  private async loadMerchants() {
    this.merchantsLoading = true;
    try {
      const raw = await this.accommodationService.getMerchants();
      this.merchants = raw.sort((a, b) => a.name.localeCompare(b.name));
      this.filteredMerchants = this.merchants;
    } catch (error) {
      console.error('Failed to load merchants', error);
      this.notificationService.showError('Could not load the merchant list.');
    } finally {
      this.merchantsLoading = false;
    }
  }

  // B2B accounts need a merchant instead of a company
  private applyB2bValidators(isB2b: boolean) {
    const merchant = this.userForm.get('b2bMerchant')!;
    const company = this.userForm.get('companyId')!;
    if (isB2b) {
      merchant.setValidators(Validators.required);
      company.clearValidators();
    } else {
      merchant.clearValidators();
      company.setValidators(Validators.required);
    }
    merchant.updateValueAndValidity();
    company.updateValueAndValidity();
  }

  compareMerchants(a: any, b: any): boolean {
    return a && b ? a.id === b.id : a === b;
  }

  private async loadUserData(id: string) {
    // Wait for the merchant list so the stored partner is shown in the dropdown
    await this.merchantsReady;
    const user = await firstValueFrom(this.userService.get(id));
    if (user) {
      const isB2b = user.b2bMerchantId != null;
      this.userForm.patchValue({
        ...user,
        isB2b,
        b2bMerchant: isB2b
          ? {
              id: user.b2bMerchantId,
              externalMerchantId: user.b2bExternalMerchantId,
              name: user.b2bMerchantName,
            }
          : null,
        permissions: user.permissions || {},
      });
      // Keep the account's partner selectable even if it's missing from the API list
      const current = this.userForm.get('b2bMerchant')?.value;
      if (current && !this.merchants.some((m) => m.id === current.id)) {
        this.merchants = [current, ...this.merchants];
        this.filteredMerchants = this.merchants;
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.userForm || this.userForm.invalid) {
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    try {
      const formValue = this.userForm.getRawValue();
      const isB2b = !!formValue.isB2b;
      const merchant = isB2b ? formValue.b2bMerchant : null;
      const companies = await firstValueFrom(this.companies$);
      const selectedCompany = companies.find((c) => c.id === formValue.companyId);

      if (!isB2b && !selectedCompany) {
        this.notificationService.showError('Selected company not found.');
        return;
      }

      if (this.isEditMode && this.userId) {
        // Use displayName instead of name
        const updatedProfile: Partial<UserProfile> = {
          displayName: formValue.displayName,
          companyId: selectedCompany?.id ?? null,
          companyName: selectedCompany?.name ?? null,
          companyType: selectedCompany?.type ?? null,
          // B2B accounts have no feature permissions; switching an account back clears the binding
          permissions: isB2b ? {} : formValue.permissions,
          b2bMerchantId: merchant ? merchant.id : null,
          b2bExternalMerchantId: merchant ? merchant.externalMerchantId : null,
          b2bMerchantName: merchant ? merchant.name : null,
        } as Partial<UserProfile>; // company fields are null for B2B accounts
        await this.userService.update(this.userId, updatedProfile);
        this.notificationService.showSuccess('User updated successfully!');
      } else {
        // NOTE: If you implemented the Cloud Function `createUser` from earlier,
        // you might want to call `this.userService.createNewUser(formValue)` here instead!
        await this.userService.createNewUser(formValue, selectedCompany, merchant);
        this.notificationService.showSuccess('User created successfully!');
      }
      this.router.navigate(['/users']);
    } catch (error: any) {
      console.error('Error saving user:', error);
      this.notificationService.showError(error.message || 'Failed to save user.');
    }
  }
}
