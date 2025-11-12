// src/app/pages/guests/guest-edit/guest-edit.ts
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, firstValueFrom, map, takeUntil } from 'rxjs'; // Import takeUntil
import { Guest } from '../../../models/guest.model';
import { GuestService } from '../../../services/guest.service';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { NotificationService } from '../../../services/notification.service';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker'; // Keep for providers

// Shared Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { CommonModule } from '@angular/common';

// --- IMPORT NEW UTILS AND INTERFACE ---
import { GuestForm } from '../guest.form.model';
import { createGuestForm, getGuestFormPatchValue, prepareGuestPayload } from '../guest-form.utils';
import { GuestFormComponent } from '../guest-form/guest-form';

@Component({
  selector: 'app-guest-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    EditPageComponent,
    MatDatepickerModule,
    GuestFormComponent, // <-- ADD NEW COMPONENT
  ],
  templateUrl: './guest-edit.html',
  styleUrl: './guest-edit.scss',
})
export class GuestEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private guestService = inject(GuestService);
  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  guestForm!: FormGroup<GuestForm>; // <-- Use shared interface
  isEditMode = false;
  private guestId: string | null = null;
  tourOperators$: Observable<Partner[]>;
  hotels$: Observable<Partner[]>;

  private _onDestroy = new Subject<void>();

  constructor() {
    this.tourOperators$ = this.partnerService
      .getAll()
      .pipe(
        map((partners) =>
          partners
            .filter((p) => p.type === PartnerType.TOUR_OPERATOR)
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      );

    this.hotels$ = this.partnerService
      .getAll()
      .pipe(
        map((partners) =>
          partners
            .filter((p) => p.type === PartnerType.HOTEL)
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      );
  }

  async ngOnInit(): Promise<void> {
    this.guestId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.guestId;

    // --- USE UTILITY TO CREATE FORM ---
    this.guestForm = createGuestForm(this.fb);

    // --- REMOVED valueChanges listeners (moved to GuestFormComponent) ---

    // Update Tour Operator Name when ID changes (Keep this here as it's part of this component's data)
    this.guestForm.controls.tourOperatorId.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(async (id) => {
        // <-- made async
        if (id) {
          // --- FIX: Pass the observable to firstValueFrom ---
          const ops = await firstValueFrom(this.tourOperators$);
          const selectedOp = ops.find((o) => o.id === id);
          if (selectedOp) {
            this.guestForm.controls.tourOperatorName.setValue(selectedOp.name);
          }
        } else {
          // --- ADDED: Clear name if ID is cleared ---
          this.guestForm.controls.tourOperatorName.setValue(null);
        }
      });

    if (this.isEditMode && this.guestId) {
      const [guestData, hotels] = await Promise.all([
        firstValueFrom(this.guestService.get(this.guestId)),
        firstValueFrom(this.hotels$),
      ]);

      if (guestData) {
        // --- USE UTILITY TO GET PATCH VALUE ---
        const formData = getGuestFormPatchValue(guestData, hotels);
        this.guestForm.patchValue(formData);
      } else {
        this.notificationService.showError('Guest not found!');
        this.router.navigate(['/guests']);
      }
    }
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  async onSubmit(): Promise<void> {
    if (this.guestForm.invalid) {
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    const formValue = this.guestForm.getRawValue();

    if (!formValue.tourOperatorId || !formValue.tourOperatorName) {
      this.notificationService.showError('Tour Operator is required.');
      return;
    }

    // --- USE UTILITY TO PREPARE PAYLOAD ---
    const guestPayload = prepareGuestPayload(formValue);

    try {
      if (this.isEditMode && this.guestId) {
        await this.guestService.update(this.guestId, guestPayload as Guest);
        this.notificationService.showSuccess('Guest updated successfully!');
      } else {
        await this.guestService.add(guestPayload as Guest);
        this.notificationService.showSuccess('Guest created successfully!');
      }
      this.router.navigate(['/guests']);
    } catch (error: any) {
      console.error('Error saving guest:', error);
      this.notificationService.showError(error.message || 'Failed to save guest.');
    }
  }
}
