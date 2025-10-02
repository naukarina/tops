// src/app/pages/partners/partner-edit/partner-edit.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  partnerForm!: FormGroup;
  isEditMode = false;
  partnerTypes = Object.values(PartnerType);
  private partnerId: string | null = null;

  async ngOnInit(): Promise<void> {
    this.partnerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.partnerId;

    this.partnerForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      contactInfo: this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        tel: [''],
      }),
      currencyName: ['', Validators.required],
    });

    if (this.isEditMode && this.partnerId) {
      const partnerDoc = await this.partnerService.get(this.partnerId);
      if (partnerDoc.exists()) {
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

    const partnerData = this.partnerForm.value as Partner;

    if (this.isEditMode && this.partnerId) {
      await this.partnerService.update(this.partnerId, partnerData);
    } else {
      await this.partnerService.add(partnerData);
    }
    this.router.navigate(['/partners']);
  }
}
