import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, firstValueFrom, map, startWith } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { Guest, Pax } from '../../../models/guest.model';
import { GuestService } from '../../../services/guest.service';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { NotificationService } from '../../../services/notification.service';
import { Timestamp } from '@angular/fire/firestore';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatDatepickerModule } from '@angular/material/datepicker';

// Shared Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { CommonModule } from '@angular/common';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';

// Form Interface
export interface GuestForm {
  name: FormControl<string>;
  email: FormControl<string | null>;
  tel: FormControl<string | null>;
  fileRef: FormControl<string | null>;
  remarks: FormControl<string | null>;
  tourOperatorId: FormControl<string | null>;
  tourOperatorName: FormControl<string | null>;
  arrivalDate: FormControl<Date | null>;
  departureDate: FormControl<Date | null>;

  // --- ADD THESE CONTROLS FOR THE FORM LOGIC ---
  arrivalLocationSelect: FormControl<string | null>;
  arrivalLocationCustom: FormControl<string | null>;
  departureLocationSelect: FormControl<string | null>;
  departureLocationCustom: FormControl<string | null>;
  // --- END ADD ---

  pax: FormGroup<{
    adult: FormControl<number | null>;
    child: FormControl<number | null>;
    infant: FormControl<number | null>;
    total: FormControl<number | null>;
  }>;
}

@Component({
  selector: 'app-guest-edit',
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
    MatSlideToggleModule,
    NgxMatSelectSearchModule,
    MatDatepickerModule,
    SearchableSelectComponent,
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

  guestForm!: FormGroup<GuestForm>;
  isEditMode = false;
  private guestId: string | null = null;
  tourOperators$: Observable<Partner[]>;
  hotels$: Observable<Partner[]>; // <-- ADDED

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

    // --- ADDED: Fetch and sort hotels ---
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

    this.guestForm = this.fb.group({
      name: this.fb.control('', {
        nonNullable: true,
        validators: Validators.required,
      }),
      tourOperatorId: this.fb.control<string | null>(null, Validators.required),
      tourOperatorName: this.fb.control<string | null>({
        value: null,
        disabled: true,
      }),
      arrivalDate: this.fb.control<Date | null>(null),
      departureDate: this.fb.control<Date | null>(null),

      // --- ADDED: Location form controls ---
      arrivalLocationSelect: this.fb.control<string | null>(null),
      arrivalLocationCustom: this.fb.control<string | null>(null),
      departureLocationSelect: this.fb.control<string | null>(null),
      departureLocationCustom: this.fb.control<string | null>(null),
      // --- END ADD ---

      pax: this.fb.group({
        adult: this.fb.control<number | null>(null, [Validators.min(0)]),
        child: this.fb.control<number | null>(null, [Validators.min(0)]),
        infant: this.fb.control<number | null>(null, [Validators.min(0)]),
        total: this.fb.control<number | null>({ value: null, disabled: true }),
      }),
      email: this.fb.control<string | null>(null, [Validators.email]),
      tel: this.fb.control<string | null>(null),
      fileRef: this.fb.control<string | null>(null),
      remarks: this.fb.control<string | null>(null),
    });

    // --- ADDED: Logic to reset custom field if "Custom" is not selected ---
    this.guestForm.controls.arrivalLocationSelect.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((value) => {
        if (value !== 'Custom') {
          this.guestForm.controls.arrivalLocationCustom.reset();
        }
      });

    this.guestForm.controls.departureLocationSelect.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((value) => {
        if (value !== 'Custom') {
          this.guestForm.controls.departureLocationCustom.reset();
        }
      });
    // --- END ADD ---

    // Update Tour Operator Name when ID changes
    this.guestForm.controls.tourOperatorId.valueChanges
      .pipe(takeUntil(this._onDestroy), startWith(this.guestForm.controls.tourOperatorId.value))
      .subscribe((id) => {
        if (id) {
          this.tourOperators$.pipe(first()).subscribe((ops) => {
            const selectedOp = ops.find((o) => o.id === id);
            if (selectedOp) {
              this.guestForm.controls.tourOperatorName.setValue(selectedOp.name);
            }
          });
        }
      });

    // Update total Pax when pax numbers change
    this.guestForm.controls.pax.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((paxValue) => {
        const adult = paxValue.adult || 0;
        const child = paxValue.child || 0;
        const infant = paxValue.infant || 0;
        this.guestForm.controls.pax.controls.total.setValue(adult + child + infant, {
          emitEvent: false,
        });
      });

    if (this.isEditMode && this.guestId) {
      // --- MODIFIED: Load hotels and guest data in parallel ---
      const [guestData, hotels] = await Promise.all([
        firstValueFrom(this.guestService.get(this.guestId)),
        firstValueFrom(this.hotels$),
      ]);

      if (guestData) {
        // Convert Timestamps back to JS Dates for the form
        const formData: any = {
          ...guestData,
          arrivalDate: guestData.arrivalDate ? guestData.arrivalDate.toDate() : null,
          departureDate: guestData.departureDate ? guestData.departureDate.toDate() : null,
        };

        // --- ADDED: Logic to populate location fields on load ---
        const arrivalHotel = hotels.find((h) => h.name === guestData.arrivalLocation);
        if (arrivalHotel) {
          formData.arrivalLocationSelect = arrivalHotel.name;
        } else if (guestData.arrivalLocation) {
          formData.arrivalLocationSelect = 'Custom';
          formData.arrivalLocationCustom = guestData.arrivalLocation;
        }

        const departureHotel = hotels.find((h) => h.name === guestData.departureLocation);
        if (departureHotel) {
          formData.departureLocationSelect = departureHotel.name;
        } else if (guestData.departureLocation) {
          formData.departureLocationSelect = 'Custom';
          formData.departureLocationCustom = guestData.departureLocation;
        }
        // --- END ADD ---

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

    const guestPayload: Partial<Guest> = {
      name: formValue.name,
      tourOperatorId: formValue.tourOperatorId,
      tourOperatorName: formValue.tourOperatorName,

      email: formValue.email ?? undefined,
      tel: formValue.tel ?? undefined,
      fileRef: formValue.fileRef ?? undefined,
      remarks: formValue.remarks ?? undefined,

      pax: {
        adult: formValue.pax.adult ?? undefined,
        child: formValue.pax.child ?? undefined,
        infant: formValue.pax.infant ?? undefined,
        total: formValue.pax.total ?? undefined,
      },
      arrivalDate: formValue.arrivalDate ? Timestamp.fromDate(formValue.arrivalDate) : undefined,
      departureDate: formValue.departureDate
        ? Timestamp.fromDate(formValue.departureDate)
        : undefined,

      // --- ADDED: Logic to save the correct location value ---
      arrivalLocation:
        formValue.arrivalLocationSelect === 'Custom'
          ? formValue.arrivalLocationCustom ?? undefined
          : formValue.arrivalLocationSelect ?? undefined,
      departureLocation:
        formValue.departureLocationSelect === 'Custom'
          ? formValue.departureLocationCustom ?? undefined
          : formValue.departureLocationSelect ?? undefined,
      // --- END ADD ---
    };

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
