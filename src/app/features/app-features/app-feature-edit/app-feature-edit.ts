import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';

import { AppFeature } from '../../../core/models/app-feature.model';
import { AppFeatureService } from '../../../core/services/app-feature.service';
import { NotificationService } from '../../../core/services/notification.service';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

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
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './app-feature-edit.html',
})
export class AppFeatureEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private featureService = inject(AppFeatureService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  featureForm!: FormGroup;
  isEditMode = false;
  private featureId: string | null = null;

  ngOnInit(): void {
    this.featureId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.featureId;

    this.featureForm = this.fb.group({
      // Key should ideally not be changed once set to prevent breaking code references
      key: [{ value: '', disabled: this.isEditMode }, Validators.required],
      label: ['', Validators.required],
      description: [''],
      order: [0, Validators.min(0)],
      isActive: [true],
    });

    if (this.isEditMode && this.featureId) {
      this.loadFeatureData(this.featureId);
    }
  }

  private async loadFeatureData(id: string) {
    try {
      const feature = await firstValueFrom(this.featureService.get(id));
      if (feature) {
        this.featureForm.patchValue(feature);
      }
    } catch (error) {
      console.error('Error loading feature:', error);
      this.notificationService.showError('Error loading feature details.');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.featureForm.invalid) {
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    try {
      // Use getRawValue so we grab the 'key' even if the input is disabled
      const formValue = this.featureForm.getRawValue();

      if (this.isEditMode && this.featureId) {
        await this.featureService.update(this.featureId, formValue as Partial<AppFeature>);
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
