import { Component, Inject, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { Timestamp } from '@angular/fire/firestore';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';
import { CurrencyName } from '../../../core/models/currency.model';
import { Partner } from '../../partners/models/partner.model';
import { Product } from '../../products/models/product.model';
import { ProductService } from '../../products/services/product.service';
import { PricelistService } from '../../pricelists/services/pricelist.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Pricelist } from '../../pricelists/models/pricelist.model';
import { Currency } from '../../../core/models/currency.model';
import {
  RESERVATION_TYPE_CATEGORIES,
  RESERVATION_TYPE_LABELS,
  Reservation,
  ReservationType,
} from '../models/reservation.model';
import { resolveUnitPrice } from '../utils/reservation-pricing.util';

export interface ReservationDialogData {
  type: ReservationType;
  tourOperatorId: string | null;
  currencyName: CurrencyName;
  guestId: string | null;
  guestName: string | null;
  defaultDate: Date | null;
  hotels: Partner[];
  reservation?: Reservation | null;
}

const AIRPORT = 'AIRPORT';
const CUSTOM = 'Custom';

@Component({
  selector: 'app-reservation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    SearchableSelectComponent,
  ],
  templateUrl: './reservation-dialog.html',
  styleUrls: ['./reservation-dialog.scss'],
})
export class ReservationDialogComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private pricelistService = inject(PricelistService);
  private currencyService = inject(CurrencyService);

  form!: FormGroup;
  type: ReservationType;
  readonly AIRPORT = AIRPORT;
  readonly CUSTOM = CUSTOM;

  // Observable (not a plain array) so the searchable-select picks up products
  // once they finish loading — it captures its `options` input only once at init.
  filteredProducts$ = new BehaviorSubject<Product[]>([]);
  hotels: Partner[] = [];

  private allProducts: Product[] = [];
  private pricelists: Pricelist[] = [];
  private currencies: Currency[] = [];

  productName: string | null = null;
  priceOverridden = false;

  private _onDestroy = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<ReservationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReservationDialogData,
  ) {
    this.type = data.type;
    this.hotels = data.hotels ?? [];
  }

  get title(): string {
    const label = RESERVATION_TYPE_LABELS[this.type];
    return `${this.data.reservation ? 'Edit' : 'Add'} ${label}`;
  }

  get isAccommodation(): boolean {
    return this.type === ReservationType.ACCOMMODATION;
  }
  get showFlight(): boolean {
    return this.type === ReservationType.ARRIVAL || this.type === ReservationType.DEPARTURE;
  }
  get showProduct(): boolean {
    return !this.isAccommodation;
  }
  get showFromLocation(): boolean {
    return (
      this.type === ReservationType.DEPARTURE ||
      this.type === ReservationType.INTER ||
      this.type === ReservationType.SHUTTLE ||
      this.type === ReservationType.EXCURSION
    );
  }
  get showToLocation(): boolean {
    return (
      this.type === ReservationType.ARRIVAL ||
      this.type === ReservationType.INTER ||
      this.type === ReservationType.SHUTTLE ||
      this.type === ReservationType.EXCURSION
    );
  }
  get toLocationLabel(): string {
    return this.type === ReservationType.EXCURSION ? 'Location' : 'To Location';
  }

  async ngOnInit(): Promise<void> {
    this.buildForm();
    this.applyValidators();
    this.setupListeners();

    const [products, pricelists, currencies] = await Promise.all([
      firstValueFrom(this.productService.getAll()),
      firstValueFrom(this.pricelistService.getAll()),
      firstValueFrom(this.currencyService.getAll()),
    ]);
    this.allProducts = products ?? [];
    this.pricelists = pricelists ?? [];
    this.currencies = currencies ?? [];

    const categories = RESERVATION_TYPE_CATEGORIES[this.type];
    this.filteredProducts$.next(
      this.allProducts
        .filter((p) => categories.includes(p.productCategory))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );

    if (this.data.reservation) {
      this.patchFromReservation(this.data.reservation);
    }
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
    this.filteredProducts$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      date: [this.data.defaultDate ?? null],
      flightNumber: [null as string | null],
      flightTime: [null as string | null],
      pickupTime: [null as string | null],
      fromLocationSelect: [
        this.type === ReservationType.ARRIVAL ? AIRPORT : (null as string | null),
      ],
      fromLocationCustom: [null as string | null],
      toLocationSelect: [
        this.type === ReservationType.DEPARTURE ? AIRPORT : (null as string | null),
      ],
      toLocationCustom: [null as string | null],
      qty: [1, [Validators.required, Validators.min(1)]],
      pax: this.fb.group({
        adult: [0],
        child: [0],
        infant: [0],
        total: [{ value: 0, disabled: true }],
      }),
      productId: [null as string | null],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      totalPrice: [{ value: 0, disabled: true }],
      // Accommodation
      hotelNameSelect: [null as string | null],
      hotelNameCustom: [null as string | null],
      startDate: [null as Date | null],
      endDate: [null as Date | null],
      remarks: [null as string | null],
    });
  }

  private applyValidators(): void {
    const require = (name: string) => this.form.get(name)?.setValidators(Validators.required);

    if (!this.isAccommodation) {
      require('date');
      require('productId');
    }
    if (this.type === ReservationType.ARRIVAL) {
      require('toLocationSelect');
    }
    if (this.type === ReservationType.DEPARTURE) {
      require('fromLocationSelect');
    }
    if (this.type === ReservationType.INTER || this.type === ReservationType.SHUTTLE) {
      require('fromLocationSelect');
      require('toLocationSelect');
    }
    if (this.isAccommodation) {
      require('hotelNameSelect');
      require('startDate');
      require('endDate');
    }
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private setupListeners(): void {
    this.form
      .get('productId')!
      .valueChanges.pipe(takeUntil(this._onDestroy))
      .subscribe((productId) => {
        const product = this.allProducts.find((p) => p.id === productId);
        this.productName = product?.name ?? null;
        if (product && !this.priceOverridden) {
          const price = resolveUnitPrice({
            productId: product.id,
            tourOperatorId: this.data.tourOperatorId,
            date: this.form.get('date')!.value,
            currencyName: this.data.currencyName,
            pricelists: this.pricelists,
            products: this.allProducts,
            currencies: this.currencies,
          });
          this.form.get('unitPrice')!.setValue(price, { emitEvent: false });
          this.recomputeTotal();
        }
      });

    // User-initiated price edits flag an override (programmatic patches use emitEvent: false).
    this.form
      .get('unitPrice')!
      .valueChanges.pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.priceOverridden = true;
        this.recomputeTotal();
      });

    this.form
      .get('qty')!
      .valueChanges.pipe(takeUntil(this._onDestroy))
      .subscribe(() => this.recomputeTotal());

    const pax = this.form.get('pax') as FormGroup;
    pax.valueChanges.pipe(takeUntil(this._onDestroy)).subscribe((value) => {
      const total = (value.adult || 0) + (value.child || 0) + (value.infant || 0);
      pax.get('total')!.setValue(total, { emitEvent: false });
    });
  }

  private recomputeTotal(): void {
    const unitPrice = this.form.get('unitPrice')!.value || 0;
    const qty = this.form.get('qty')!.value || 1;
    this.form.get('totalPrice')!.setValue(Number((unitPrice * qty).toFixed(2)), {
      emitEvent: false,
    });
  }

  private toLocationControls(value: string | null): { select: string | null; custom: string | null } {
    if (!value) return { select: null, custom: null };
    if (value === AIRPORT) return { select: AIRPORT, custom: null };
    const isHotel = this.hotels.some((h) => h.name === value);
    if (isHotel) return { select: value, custom: null };
    return { select: CUSTOM, custom: value };
  }

  private patchFromReservation(r: Reservation): void {
    this.priceOverridden = !!r.priceOverridden;
    this.productName = r.productName ?? null;

    const from = this.toLocationControls(r.fromLocation);
    const to = this.toLocationControls(r.toLocation);
    const hotel = this.toLocationControls(r.hotelName);

    this.form.patchValue(
      {
        date: r.date ? r.date.toDate() : (this.data.defaultDate ?? null),
        flightNumber: r.flightNumber,
        flightTime: r.flightTime,
        pickupTime: r.pickupTime,
        fromLocationSelect: from.select,
        fromLocationCustom: from.custom,
        toLocationSelect: to.select,
        toLocationCustom: to.custom,
        qty: r.qty ?? 1,
        pax: {
          adult: r.pax?.adult ?? 0,
          child: r.pax?.child ?? 0,
          infant: r.pax?.infant ?? 0,
        },
        productId: r.productId,
        unitPrice: r.unitPrice ?? 0,
        hotelNameSelect: hotel.select,
        hotelNameCustom: hotel.custom,
        startDate: r.startDate ? r.startDate.toDate() : null,
        endDate: r.endDate ? r.endDate.toDate() : null,
        remarks: r.remarks,
      },
      { emitEvent: false },
    );
    this.recomputeTotal();
    const total =
      (r.pax?.adult ?? 0) + (r.pax?.child ?? 0) + (r.pax?.infant ?? 0);
    (this.form.get('pax') as FormGroup).get('total')!.setValue(total, { emitEvent: false });
  }

  private resolveLocation(select: string | null, custom: string | null): string | null {
    if (!select) return null;
    if (select === CUSTOM) return custom?.trim() || null;
    return select;
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const adult = raw.pax.adult || 0;
    const child = raw.pax.child || 0;
    const infant = raw.pax.infant || 0;
    const unitPrice = raw.unitPrice ?? 0;
    const qty = raw.qty ?? 1;

    const reservation: Reservation = {
      ...((this.data.reservation ?? {}) as Reservation),
      salesOrderId: this.data.reservation?.salesOrderId ?? '',
      type: this.type,
      guestId: this.data.guestId,
      guestName: this.data.guestName,
      tourOperatorId: this.data.tourOperatorId,
      date: raw.date ? Timestamp.fromDate(raw.date) : null,
      flightNumber: raw.flightNumber || null,
      flightTime: raw.flightTime || null,
      pickupTime: raw.pickupTime || null,
      fromLocation: this.resolveLocation(raw.fromLocationSelect, raw.fromLocationCustom),
      toLocation: this.resolveLocation(raw.toLocationSelect, raw.toLocationCustom),
      productId: this.isAccommodation ? null : raw.productId || null,
      productName: this.isAccommodation ? null : this.productName,
      qty,
      pax: { adult, child, infant, total: adult + child + infant },
      unitPrice,
      priceOverridden: this.priceOverridden,
      totalPrice: Number((unitPrice * qty).toFixed(2)),
      currencyName: this.data.currencyName,
      hotelName: this.isAccommodation
        ? this.resolveLocation(raw.hotelNameSelect, raw.hotelNameCustom)
        : null,
      startDate: this.isAccommodation && raw.startDate ? Timestamp.fromDate(raw.startDate) : null,
      endDate: this.isAccommodation && raw.endDate ? Timestamp.fromDate(raw.endDate) : null,
      accommodationId: this.data.reservation?.accommodationId ?? null,
      remarks: raw.remarks || null,
    };

    this.dialogRef.close(reservation);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
