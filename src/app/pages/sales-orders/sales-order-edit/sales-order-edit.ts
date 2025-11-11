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

// Form Interface
export interface SalesOrderForm {
  orderNumber: FormControl<number | null>;
  status: FormControl<SalesOrderStatus | null>;
  category: FormControl<SalesOrderCategory | null>;
  partnerId: FormControl<string | null>; // Supplier/Hotel
  partnerName: FormControl<string | null>;
  guestMode: FormControl<'existing' | 'new'>;
  guestId: FormControl<string | null>; // Existing Guest ID
  // Denormalized/New Guest Fields
  guestName: FormControl<string | null>;
  newGuestEmail: FormControl<string | null>; // For new guest
  newGuestTel: FormControl<string | null>; // For new guest
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

  salesOrderForm!: FormGroup<SalesOrderForm>;
  isEditMode = false;
  private soId: string | null = null;

  // Data Observables
  partners$: Observable<Partner[]>; // Suppliers, Hotels
  guests$: Observable<Guest[]>;
  tourOperators$: Observable<Partner[]>;

  // Enums for template
  statuses = Object.values(SalesOrderStatus);
  categories = Object.values(SalesOrderCategory);
  currencies = Object.values(CurrencyName);

  private _onDestroy = new Subject<void>();

  constructor() {
    const allPartners$ = this.partnerService.getAll();
    this.partners$ = allPartners$.pipe(
      map((partners) =>
        partners
          .filter((p) => p.type === PartnerType.SUPPLIER || p.type === PartnerType.HOTEL)
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
  }

  async ngOnInit(): Promise<void> {
    this.soId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.soId;

    this.salesOrderForm = this.fb.group({
      orderNumber: this.fb.control<number | null>(null, Validators.required),
      status: this.fb.control<SalesOrderStatus | null>(SalesOrderStatus.DRAFT, Validators.required),
      category: this.fb.control<SalesOrderCategory | null>(
        SalesOrderCategory.RESERVATIONS,
        Validators.required
      ),
      partnerId: this.fb.control<string | null>(null, Validators.required),
      partnerName: this.fb.control<string | null>({ value: null, disabled: true }),

      guestMode: this.fb.control<'existing' | 'new'>('existing', {
        nonNullable: true,
      }),
      guestId: this.fb.control<string | null>(null),

      // Guest Details
      guestName: this.fb.control<string | null>(null),
      newGuestEmail: this.fb.control<string | null>(null, [Validators.email]),
      newGuestTel: this.fb.control<string | null>(null),
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

  private setupFormListeners(): void {
    // --- 1. Handle Guest Mode Toggle ---
    this.salesOrderForm.controls.guestMode.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((mode) => {
        this.updateGuestValidators(mode);
      });

    // --- 2. Handle Existing Guest Selection ---
    this.salesOrderForm.controls.guestId.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(async (guestId) => {
        if (this.salesOrderForm.controls.guestMode.value === 'existing' && guestId) {
          const guests = await firstValueFrom(this.guests$);
          const selectedGuest = guests.find((g) => g.id === guestId);
          if (selectedGuest) {
            this.salesOrderForm.patchValue({
              guestName: selectedGuest.name,
              newGuestEmail: selectedGuest.email,
              newGuestTel: selectedGuest.tel,
              tourOperatorId: selectedGuest.tourOperatorId,
              tourOperatorName: selectedGuest.tourOperatorName,
              guestArrivalDate: selectedGuest.arrivalDate?.toDate(),
              guestDepartureDate: selectedGuest.departureDate?.toDate(),
              guestArrivalLocation: selectedGuest.arrivalLocation,
              guestDepartureLocation: selectedGuest.departureLocation,
              fileRef: selectedGuest.fileRef,
            });
          }
        }
      });

    // --- 3. Handle Partner Selection ---
    this.salesOrderForm.controls.partnerId.valueChanges
      .pipe(takeUntil(this._onDestroy), startWith(this.salesOrderForm.controls.partnerId.value))
      .subscribe(async (id) => {
        if (id) {
          const partners = await firstValueFrom(this.partners$);
          const selected = partners.find((p) => p.id === id);
          this.salesOrderForm.controls.partnerName.setValue(selected?.name || null);
        }
      });

    // --- 4. Handle Tour Operator Selection (for new guest) ---
    this.salesOrderForm.controls.tourOperatorId.valueChanges
      .pipe(
        takeUntil(this._onDestroy),
        startWith(this.salesOrderForm.controls.tourOperatorId.value)
      )
      .subscribe(async (id) => {
        if (id) {
          const tourOperators = await firstValueFrom(this.tourOperators$);
          const selected = tourOperators.find((p) => p.id === id);
          this.salesOrderForm.controls.tourOperatorName.setValue(selected?.name || null);
        }
      });
  }

  private updateGuestValidators(mode: 'existing' | 'new'): void {
    const guestIdCtrl = this.salesOrderForm.controls.guestId;
    const guestNameCtrl = this.salesOrderForm.controls.guestName;
    const tourOpIdCtrl = this.salesOrderForm.controls.tourOperatorId;

    if (mode === 'existing') {
      guestIdCtrl.setValidators(Validators.required);
      guestNameCtrl.clearValidators();
      tourOpIdCtrl.clearValidators();
      this.disableGuestFields();
    } else {
      // 'new'
      guestIdCtrl.clearValidators();
      guestNameCtrl.setValidators(Validators.required);
      tourOpIdCtrl.setValidators(Validators.required);
      this.enableGuestFields();
    }
    guestIdCtrl.updateValueAndValidity({ emitEvent: false });
    guestNameCtrl.updateValueAndValidity({ emitEvent: false });
    tourOpIdCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private enableGuestFields(): void {
    this.salesOrderForm.controls.guestName.enable();
    this.salesOrderForm.controls.newGuestEmail.enable();
    this.salesOrderForm.controls.newGuestTel.enable();
    this.salesOrderForm.controls.tourOperatorId.enable();
    this.salesOrderForm.controls.guestArrivalDate.enable();
    this.salesOrderForm.controls.guestDepartureDate.enable();
    this.salesOrderForm.controls.guestArrivalLocation.enable();
    this.salesOrderForm.controls.guestDepartureLocation.enable();
    this.salesOrderForm.controls.fileRef.enable();
  }

  private disableGuestFields(): void {
    this.salesOrderForm.controls.guestName.disable();
    this.salesOrderForm.controls.newGuestEmail.disable();
    this.salesOrderForm.controls.newGuestTel.disable();
    this.salesOrderForm.controls.tourOperatorId.disable();
    this.salesOrderForm.controls.guestArrivalDate.disable();
    this.salesOrderForm.controls.guestDepartureDate.disable();
    this.salesOrderForm.controls.guestArrivalLocation.disable();
    this.salesOrderForm.controls.guestDepartureLocation.disable();
    this.salesOrderForm.controls.fileRef.disable();
  }

  private async loadSalesOrderData(id: string): Promise<void> {
    const soData = await firstValueFrom(this.salesOrderService.get(id));
    if (soData) {
      const formData: any = {
        ...soData,
        guestMode: soData.guestId ? 'existing' : 'new',
        guestArrivalDate: soData.guestArrivalDate ? soData.guestArrivalDate.toDate() : null,
        guestDepartureDate: soData.guestDepartureDate ? soData.guestDepartureDate.toDate() : null,
        // The form doesn't store these, but we can load them if a guest is attached
        newGuestEmail: null,
        newGuestTel: null,
      };

      // If existing guest, fetch their email/tel to display
      if (soData.guestId) {
        const guestData = await firstValueFrom(this.guestService.get(soData.guestId));
        if (guestData) {
          formData.newGuestEmail = guestData.email;
          formData.newGuestTel = guestData.tel;
        }
        this.updateGuestValidators('existing');
      } else {
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

    try {
      // --- Step 1: Create new guest if needed ---
      if (formValue.guestMode === 'new') {
        if (!formValue.guestName || !formValue.tourOperatorId || !formValue.tourOperatorName) {
          this.notificationService.showError('New Guest Name and Tour Operator are required.');
          return;
        }
        const newGuestPayload: Partial<Guest> = {
          name: formValue.guestName,
          email: formValue.newGuestEmail || undefined,
          tel: formValue.newGuestTel || undefined,
          tourOperatorId: formValue.tourOperatorId,
          tourOperatorName: formValue.tourOperatorName,
          arrivalDate: formValue.guestArrivalDate
            ? Timestamp.fromDate(formValue.guestArrivalDate)
            : undefined,
          departureDate: formValue.guestDepartureDate
            ? Timestamp.fromDate(formValue.guestDepartureDate)
            : undefined,
          arrivalLocation: formValue.guestArrivalLocation || undefined,
          departureLocation: formValue.guestDepartureLocation || undefined,
          fileRef: formValue.fileRef || undefined,
        };
        const newGuestRef = await this.guestService.add(newGuestPayload as Guest);
        guestIdToSave = newGuestRef.id;
      }

      // --- Step 2: Build Sales Order Payload ---
      const soPayload: Partial<SalesOrder> = {
        orderNumber: formValue.orderNumber!,
        status: formValue.status!,
        category: formValue.category!,
        partnerId: formValue.partnerId!,
        partnerName: formValue.partnerName!,
        currencyName: formValue.currencyName!,
        totalPrice: formValue.totalPrice!,
        remarks: formValue.remarks || undefined,
        fileRef: formValue.fileRef || undefined,
        // Guest Info
        guestId: guestIdToSave,
        guestName: formValue.guestName || undefined,
        tourOperatorId: formValue.tourOperatorId || undefined,
        tourOperatorName: formValue.tourOperatorName || undefined,
        guestArrivalDate: formValue.guestArrivalDate
          ? Timestamp.fromDate(formValue.guestArrivalDate)
          : undefined,
        guestDepartureDate: formValue.guestDepartureDate
          ? Timestamp.fromDate(formValue.guestDepartureDate)
          : undefined,
        guestArrivalLocation: formValue.guestArrivalLocation || undefined,
        guestDepartureLocation: formValue.guestDepartureLocation || undefined,
      };

      // --- Step 3: Save Sales Order ---
      if (this.isEditMode && this.soId) {
        await this.salesOrderService.update(this.soId, soPayload as SalesOrder);
        this.notificationService.showSuccess('Sales Order updated successfully!');
      } else {
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
