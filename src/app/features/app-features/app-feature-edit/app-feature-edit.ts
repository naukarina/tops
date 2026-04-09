import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AppFeature } from '../../../core/models/app-feature.model';
import { AppFeatureService } from '../../../core/services/app-feature.service';
import { NotificationService } from '../../../core/services/notification.service';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon'; // <-- Add this import

@Component({
  selector: 'app-app-feature-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    EditPageComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatIconModule, // <-- Add to imports array
  ],
  templateUrl: './app-feature-edit.html',
  styleUrls: ['./app-feature-edit.scss'],
})
export class AppFeatureEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private featureService = inject(AppFeatureService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form!: FormGroup;
  isEditMode = false;
  private featureId: string | null = null;

  ngOnInit(): void {
    this.featureId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.featureId;

    this.form = this.fb.group({
      key: [{ value: '', disabled: this.isEditMode }, Validators.required],
      label: ['', Validators.required],
      description: [''],
      icon: [''], // <-- Add the icon form control
      order: [0, [Validators.required, Validators.min(0)]],
      isActive: [true],
    });

    if (this.isEditMode && this.featureId) {
      this.loadFeatureData(this.featureId);
    }
  }

  // ... (loadFeatureData and onSubmit remain exactly the same)
  private async loadFeatureData(id: string) {
    try {
      const feature = await firstValueFrom(this.featureService.get(id));
      if (feature) {
        this.form.patchValue(feature);
      } else {
        this.notificationService.showError('Feature not found.');
        this.router.navigate(['/app-features']);
      }
    } catch (error) {
      console.error('Error loading feature:', error);
      this.notificationService.showError('Error loading feature details.');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showError('Please fill in all required fields correctly.');
      return;
    }

    try {
      const formValue = this.form.getRawValue();

      if (this.isEditMode && this.featureId) {
        await this.featureService.update(this.featureId, formValue);
        this.notificationService.showSuccess('Feature updated successfully!');
      } else {
        await this.featureService.add(formValue as AppFeature);
        this.notificationService.showSuccess('Feature created successfully!');
      }
      this.router.navigate(['/app-features']);
    } catch (error: any) {
      console.error('Error saving feature:', error);
      this.notificationService.showError(error.message || 'Failed to save feature.');
    }
  }
}
