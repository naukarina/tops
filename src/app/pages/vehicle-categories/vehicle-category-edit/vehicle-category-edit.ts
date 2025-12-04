import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { VehicleCategoryService } from '../../../services/vehicle-category.service';
import { NotificationService } from '../../../services/notification.service';
import { VehicleCategory } from '../../../models/vehicle-category.model';
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';

// Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vehicle-category-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    EditPageComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './vehicle-category-edit.html',
})
export class VehicleCategoryEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(VehicleCategoryService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form!: FormGroup;
  isEditMode = false;
  id: string | null = null;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.id;

    this.form = this.fb.group({
      name: ['', Validators.required],
      capacity: [null, [Validators.required, Validators.min(1)]],
    });

    if (this.isEditMode && this.id) {
      this.loadData();
    }
  }

  async loadData() {
    if (!this.id) return;
    const data = await firstValueFrom(this.service.get(this.id));
    if (data) {
      this.form.patchValue(data);
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.notificationService.showError('Please check the form for errors.');
      return;
    }

    const formData = this.form.value;

    try {
      if (this.isEditMode && this.id) {
        await this.service.update(this.id, formData);
        this.notificationService.showSuccess('Updated successfully.');
      } else {
        await this.service.add(formData as VehicleCategory);
        this.notificationService.showSuccess('Created successfully.');
      }
      this.router.navigate(['/vehicle-categories']);
    } catch (error: any) {
      console.error(error);
      this.notificationService.showError(error.message || 'Error saving.');
    }
  }
}
