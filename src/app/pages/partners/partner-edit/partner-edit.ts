// src/app/pages/partners/partner-edit/partner-edit.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';

// Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

// Shared Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';

export interface PartnerForm {
  name: FormControl<string>;
  type: FormControl<PartnerType | null>;
  contactInfo: FormGroup<{
    email: FormControl<string>;
    tel: FormControl<string | null>;
  }>;
  currencyName: FormControl<string>;
}

@Component({
  selector: 'app-partners-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    EditPageComponent,
    MatSelectModule,
  ],
  templateUrl: './partner-edit.html',
})
export class PartnerEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private partnerService = inject(PartnerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Use the new interface to type the form
  partnerForm!: FormGroup<PartnerForm>;
  isEditMode = false;
  partnerTypes = Object.values(PartnerType);
  private partnerId: string | null = null;

  async ngOnInit(): Promise<void> {
    this.partnerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.partnerId;

    // Use non-nullable controls and explicit types
    this.partnerForm = this.fb.group({
      name: this.fb.control('', { nonNullable: true, validators: Validators.required }),
      type: this.fb.control<PartnerType | null>(null, Validators.required),
      contactInfo: this.fb.group({
        email: this.fb.control('', {
          nonNullable: true,
          validators: [Validators.required, Validators.email],
        }),
        tel: this.fb.control(''),
      }),
      currencyName: this.fb.control('', { nonNullable: true, validators: Validators.required }),
    });

    if (this.isEditMode && this.partnerId) {
      const partnerDoc = await this.partnerService.get(this.partnerId);
      if (partnerDoc.exists()) {
        // The data from Firestore will correctly patch the typed form
        this.partnerForm.patchValue(partnerDoc.data());
      } else {
        console.error('Partner not found!');
        this.router.navigate(['/partners']);
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.partnerForm.invalid) {
      return;
    }

    // Use getRawValue() to get all values, including disabled ones
    const partnerData = this.partnerForm.getRawValue() as Partner;

    if (this.isEditMode && this.partnerId) {
      await this.partnerService.update(this.partnerId, partnerData);
    } else {
      await this.partnerService.add(partnerData);
    }
    this.router.navigate(['/partners']);
  }
}
