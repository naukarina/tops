// src/app/pages/partners/partner-edit/partner-edit.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';
import { PartnerService } from '../../../services/partner.service';
import { PartnerType } from '../../../models/partner.model';

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
  styleUrls: ['./partner-edit.scss'],
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

  ngOnInit(): void {
    this.partnerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.partnerId;

    this.partnerForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      contactInfo: this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        tel: [''],
        tel2: [''],
        address: [''],
        zip: [''],
        town: [''],
        country: [''],
      }),
      taxinfo: this.fb.group({
        brn: [''],
        isVatRegistered: [false],
        vatNumber: [''],
      }),
      currencyName: ['', Validators.required],
      remarks: [''],
      hotelInfo: this.fb.group({
        starRating: [null],
        region: [''],
      }),
      isActive: [true, Validators.required],
    });

    if (this.isEditMode && this.partnerId) {
      this.partnerService
        .getPartner(this.partnerId)
        .pipe(first())
        .subscribe((partner) => {
          this.partnerForm.patchValue(partner);
        });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.partnerForm.invalid) {
      return;
    }

    if (this.isEditMode && this.partnerId) {
      await this.partnerService.updatePartner(this.partnerId, this.partnerForm.value);
    } else {
      await this.partnerService.addPartner(this.partnerForm.value);
    }
    this.router.navigate(['/partners']);
  }
}
