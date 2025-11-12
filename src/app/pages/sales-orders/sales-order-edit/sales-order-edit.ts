// src/app/pages/sales-orders/sales-order-edit/sales-order-edit.ts
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
import { Guest } from '../../../models/guest.model';
import { GuestService } from '../../../services/guest.service';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import {
  SalesOrder,
  SalesOrderCategory,
  SalesOrderStatus,
} from '../../../models/sales-order.model';
import { SalesOrderService } from '../../../services/sales-order.service';
import { NotificationService } from '../../../services/notification.service';
import { CurrencyName } from '../../../models/currency.model';
import { Timestamp } from '@angular/fire/firestore';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';

// Shared Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { CommonModule } from '@angular/common';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';

// --- IMPORT NEW UTILS AND INTERFACE ---
import { GuestForm } from '../../guests/guest.form.model';
import {
  createGuestForm,
  getGuestFormPatchValue,
  prepareGuestPayload,
} from '../../guests/guest-form.utils';
import { GuestFormComponent } from '../../guests/guest-form/guest-form';

// Form Interface
export interface SalesOrderForm {
  partnerId: FormControl<string | null>;
  partnerName: FormControl<string | null>;
  guestMode: FormControl<'existing' | 'new'>;
  guestId: FormControl<string | null>;

  // --- REPLACED individual fields with a nested FormGroup ---
  newGuestForm: FormGroup<GuestForm>;

  // Denormalized fields for the Sales Order itself
  guestName: FormControl<string | null>;
  tourOperatorId: FormControl<string | null>;
  tourOperatorName: FormControl<string | null>;
  guestArrivalDate: FormControl<Date | null>;
  guestDepartureDate: FormControl<Date | null>;
  guestArrivalLocation: FormControl<string | null>;
  guestDepartureLocation: FormControl<string | null>;
  fileRef: FormControl<string | null>;

  // Order Totals
  currencyName: FormControl<CurrencyName | null>;
  totalPrice: FormControl<number | null>;
  remarks: FormControl<string | null>;
}

@Component({
  selector: 'app-sales-order-edit',
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
    MatDatepickerModule,
    SearchableSelectComponent,
    MatRadioModule,
    MatDividerModule,
    GuestFormComponent, // <-- ADD NEW COMPONENT
  ],
  templateUrl: './sales-order-edit.html',
  styleUrl: './sales-order-edit.scss',
})
export class SalesOrderEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private salesOrderService = inject(SalesOrderService);
  private partnerService = inject(PartnerService);
  private guestService = inject(GuestService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  salesOrderForm!: FormGroup; // Use base FormGroup
  isEditMode = false;
  private soId: string | null = null;

  // Data Observables
  partners$: Observable<Partner[]>;
  guests$: Observable<Guest[]>;
  tourOperators$: Observable<Partner[]>;
  hotels$: Observable<Partner[]>; // <-- ADDED

  // Enums for template
  currencies = Object.values(CurrencyName);

  private _onDestroy = new Subject<void>();

  constructor() {
    const allPartners$ = this.partnerService.getAll();
    this.partners$ = allPartners$.pipe(
      map((partners) =>
        partners
          .filter((p) => p.type === PartnerType.TOUR_OPERATOR)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
    this.tourOperators$ = allPartners$.pipe(
      map((partners) =>
        partners
          .filter((p) => p.type === PartnerType.TOUR_OPERATOR)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
    this.guests$ = this.guestService
      .getAll()
      .pipe(map((guests) => guests.sort((a, b) => a.name.localeCompare(b.name))));

    // --- ADDED: hotels$ observable ---
    this.hotels$ = allPartners$.pipe(
      map((partners) =>
        partners
          .filter((p) => p.type === PartnerType.HOTEL)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
  }

  async ngOnInit(): Promise<void> {
    this.soId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.soId;

    // --- UPDATED: Form definition ---
    this.salesOrderForm = this.fb.group({
      partnerId: this.fb.control<string | null>(null, Validators.required),
      partnerName: this.fb.control<string | null>({
        value: null,
        disabled: true,
      }),

      guestMode: this.fb.control<'existing' | 'new'>('existing', {
        nonNullable: true,
      }),
      guestId: this.fb.control<string | null>(null),

      // --- ADDED: Nested GuestForm ---
      newGuestForm: createGuestForm(this.fb),

      // Denormalized Guest Details (for the SO payload)
      guestName: this.fb.control<string | null>(null),
      tourOperatorId: this.fb.control<string | null>(null),
      tourOperatorName: this.fb.control<string | null>({
        value: null,
        disabled: true,
      }),
      guestArrivalDate: this.fb.control<Date | null>(null),
      guestDepartureDate: this.fb.control<Date | null>(null),
      guestArrivalLocation: this.fb.control<string | null>(null),
      guestDepartureLocation: this.fb.control<string | null>(null),
      fileRef: this.fb.control<string | null>(null),

      // Totals
      currencyName: this.fb.control<CurrencyName | null>(null, Validators.required),
      totalPrice: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
      remarks: this.fb.control<string | null>(null),
    });

    this.setupFormListeners();

    if (this.isEditMode && this.soId) {
      this.loadSalesOrderData(this.soId);
    } else {
      // Set validators for create mode
      this.updateGuestValidators('existing');
    }
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  // --- HELPER to get typed controls ---
  get soFormControls() {
    return this.salesOrderForm.controls as unknown as {
      [K in keyof SalesOrderForm]: SalesOrderForm[K];
    };
  }

  private setupFormListeners(): void {
    // --- 1. Handle Guest Mode Toggle ---
    this.soFormControls.guestMode.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((mode) => {
        this.updateGuestValidators(mode);
      });

    // --- 2. Handle Existing Guest Selection ---
    this.soFormControls.guestId.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(async (guestId) => {
        if (this.soFormControls.guestMode.value === 'existing' && guestId) {
          const [guests, hotels] = await Promise.all([
            firstValueFrom(this.guests$),
            firstValueFrom(this.hotels$),
          ]);
          const selectedGuest = guests.find((g) => g.id === guestId);

          if (selectedGuest) {
            // Patch the main SO form's denormalized fields
            this.salesOrderForm.patchValue({
              guestName: selectedGuest.name,
              tourOperatorId: selectedGuest.tourOperatorId,
              tourOperatorName: selectedGuest.tourOperatorName,
              guestArrivalDate: selectedGuest.arrivalDate?.toDate(),
              guestDepartureDate: selectedGuest.departureDate?.toDate(),
              guestArrivalLocation: selectedGuest.arrivalLocation,
              guestDepartureLocation: selectedGuest.departureLocation,
              fileRef: selectedGuest.fileRef,
            });

            // --- ADDED: Patch the disabled newGuestForm for visual display ---
            const guestFormData = getGuestFormPatchValue(selectedGuest, hotels);
            this.soFormControls.newGuestForm.patchValue(guestFormData);
          }
        } else {
          // Clear fields if no guest is selected
          this.salesOrderForm.patchValue({
            guestName: null,
            tourOperatorId: null,
            tourOperatorName: null,
            guestArrivalDate: null,
            guestDepartureDate: null,
            guestArrivalLocation: null,
            guestDepartureLocation: null,
            fileRef: null,
          });
          this.soFormControls.newGuestForm.reset();
        }
      });

    // --- 3. Handle Partner Selection ---
    this.soFormControls.partnerId.valueChanges
      .pipe(takeUntil(this._onDestroy), startWith(this.soFormControls.partnerId.value))
      .subscribe(async (id) => {
        if (id) {
          const partners = await firstValueFrom(this.partners$);
          const selected = partners.find((p) => p.id === id);
          this.soFormControls.partnerName.setValue(selected?.name || null);
        }
      });

    // --- 4. Handle Tour Operator Selection (for new guest) ---
    // This is now handled *inside* the GuestFormComponent
  }

  private updateGuestValidators(mode: 'existing' | 'new'): void {
    const guestIdCtrl = this.soFormControls.guestId;
    const newGuestFormCtrl = this.soFormControls.newGuestForm;

    if (mode === 'existing') {
      guestIdCtrl.setValidators(Validators.required);
      newGuestFormCtrl.disable();
      newGuestFormCtrl.controls.name.clearValidators();
      newGuestFormCtrl.controls.tourOperatorId.clearValidators();
    } else {
      // 'new'
      guestIdCtrl.clearValidators();
      newGuestFormCtrl.enable();
      newGuestFormCtrl.controls.name.setValidators(Validators.required);
      newGuestFormCtrl.controls.tourOperatorId.setValidators(Validators.required);
    }
    guestIdCtrl.updateValueAndValidity({ emitEvent: false });
    newGuestFormCtrl.controls.name.updateValueAndValidity({ emitEvent: false });
    newGuestFormCtrl.controls.tourOperatorId.updateValueAndValidity({ emitEvent: false });
  }

  private async loadSalesOrderData(id: string): Promise<void> {
    const [soData, hotels] = await Promise.all([
      firstValueFrom(this.salesOrderService.get(id)),
      firstValueFrom(this.hotels$),
    ]);

    if (soData) {
      const formData: any = {
        ...soData,
        guestMode: soData.guestId ? 'existing' : 'new',
        guestArrivalDate: soData.guestArrivalDate ? soData.guestArrivalDate.toDate() : null,
        guestDepartureDate: soData.guestDepartureDate ? soData.guestDepartureDate.toDate() : null,
      };

      if (soData.guestId) {
        const guestData = await firstValueFrom(this.guestService.get(soData.guestId));
        if (guestData) {
          // --- UPDATED: Patch the nested form ---
          const guestFormData = getGuestFormPatchValue(guestData, hotels);
          this.soFormControls.newGuestForm.patchValue(guestFormData);
        }
        this.updateGuestValidators('existing');
      } else {
        // SO was created with a new guest, so we populate the newGuestForm
        // with the denormalized data from the SO itself.
        const guestFormData = getGuestFormPatchValue(soData as any, hotels);
        this.soFormControls.newGuestForm.patchValue(guestFormData);
        this.updateGuestValidators('new');
      }

      this.salesOrderForm.patchValue(formData);
    } else {
      this.notificationService.showError('Sales Order not found!');
      this.router.navigate(['/sales-orders']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.salesOrderForm.invalid) {
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    const formValue = this.salesOrderForm.getRawValue();
    let guestIdToSave: string | undefined = formValue.guestId || undefined;
    let newGuestPayload: Partial<Guest> | null = null;

    try {
      // --- Step 1: Create new guest if needed ---
      if (formValue.guestMode === 'new') {
        // --- UPDATED: Use the nested form value ---
        const newGuestFormValue = this.soFormControls.newGuestForm.getRawValue();

        if (!newGuestFormValue.name || !newGuestFormValue.tourOperatorId) {
          this.notificationService.showError('New Guest Name and Tour Operator are required.');
          return;
        }

        // --- UPDATED: Use utility to prepare payload ---
        newGuestPayload = prepareGuestPayload(newGuestFormValue);

        const newGuestRef = await this.guestService.add(newGuestPayload as Guest);
        guestIdToSave = newGuestRef.id;
      }

      // --- Step 2: Build Sales Order Payload ---
      const soPayload: Partial<SalesOrder> = {
        partnerId: formValue.partnerId!,
        partnerName: formValue.partnerName!,
        currencyName: formValue.currencyName!,
        totalPrice: formValue.totalPrice!,
        remarks: formValue.remarks ?? null,
      };

      // --- UPDATED: Populate guest info from the correct source ---
      if (formValue.guestMode === 'new' && newGuestPayload) {
        soPayload.guestId = guestIdToSave ?? null;
        soPayload.guestName = newGuestPayload.name ?? null;
        soPayload.tourOperatorId = newGuestPayload.tourOperatorId ?? null;
        soPayload.tourOperatorName = newGuestPayload.tourOperatorName ?? null;
        soPayload.guestArrivalDate = newGuestPayload.arrivalDate ?? null;
        soPayload.guestDepartureDate = newGuestPayload.departureDate ?? null;
        soPayload.guestArrivalLocation = newGuestPayload.arrivalLocation ?? null;
        soPayload.guestDepartureLocation = newGuestPayload.departureLocation ?? null;
        soPayload.fileRef = newGuestPayload.fileRef ?? null;
      } else {
        // Mode is 'existing', use the top-level denormalized fields
        soPayload.guestId = formValue.guestId ?? null;
        soPayload.guestName = formValue.guestName ?? null;
        soPayload.tourOperatorId = formValue.tourOperatorId ?? null;
        soPayload.tourOperatorName = formValue.tourOperatorName ?? null;
        soPayload.guestArrivalDate = formValue.guestArrivalDate
          ? Timestamp.fromDate(formValue.guestArrivalDate)
          : null;
        soPayload.guestDepartureDate = formValue.guestDepartureDate
          ? Timestamp.fromDate(formValue.guestDepartureDate)
          : null;
        soPayload.guestArrivalLocation = formValue.guestArrivalLocation ?? null;
        soPayload.guestDepartureLocation = formValue.guestDepartureLocation ?? null;
        soPayload.fileRef = formValue.fileRef ?? null;
      }

      // --- Step 3: Save Sales Order ---
      if (this.isEditMode && this.soId) {
        await this.salesOrderService.update(this.soId, soPayload as SalesOrder);
        this.notificationService.showSuccess('Sales Order updated successfully!');
      } else {
        soPayload.status = SalesOrderStatus.DRAFT;
        soPayload.category = SalesOrderCategory.RESERVATIONS;
        soPayload.orderNumber = -1; // Placeholder for cloud function
        await this.salesOrderService.add(soPayload as SalesOrder);
        this.notificationService.showSuccess('Sales Order created successfully!');
      }
      this.router.navigate(['/sales-orders']);
    } catch (error: any) {
      console.error('Error saving sales order:', error);
      this.notificationService.showError(error.message || 'Failed to save sales order.');
    }
  }
}
