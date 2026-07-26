import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

// Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// App Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { AccommodationService } from '../services/accommodation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Accommodation } from '../models/accommodation.model';
import { PriceDetailsDialogComponent } from './price-details-dialog';
import { PromotionInfoDialogComponent } from './promotion-info-dialog';
import { HttpClient } from '@angular/common/http';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

@Component({
  selector: 'app-accommodation-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatButtonToggleModule,
    EditPageComponent,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './accommodation-edit.html',
  styleUrls: ['./accommodation-edit.scss'],
  providers: [DecimalPipe],
})
export class AccommodationEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(AccommodationService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);
  form!: FormGroup;
  isEditMode = false;
  bookingId: string | null = null;

  valuationResults: any[] = [];
  rawValuationResult: any[] = [];
  merchants: any[] = [];
  filteredMerchants: any[] = [];
  merchantSearchCtrl = new FormControl('');
  merchantCtrl = new FormControl(null);
  merchantsLoading = false;
  selectedMerchant: any = null;
  hotels: any[] = [];
  filteredHotels: any[] = [];
  hotelSearchCtrl = new FormControl('');
  hotelsLoading = false;
  selectedHotel: any = null;
  // One chosen offer per room candidate (a radio group spans all room-type
  // cards of the same candidate, so you pick room type + promotion in one go)
  selectedOffers: Record<number, any> = {};
  // Meal plan filter shown above the results; cards only list offers of this plan
  mealPlanFilter: string | null = null;

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.bookingId;

    this.initForm();

    this.hotelSearchCtrl.valueChanges.subscribe((search) => {
      const q = (search ?? '').toLowerCase();
      this.filteredHotels = this.hotels.filter((h) => h.name.toLowerCase().includes(q));
    });

    // Check-out can never be before check-in: the picker's [min] blocks the calendar,
    // and this clears a check-out that a later check-in change has invalidated
    this.form.get('startDate')!.valueChanges.subscribe((start) => {
      const end = this.form.get('endDate')?.value;
      if (start && end && new Date(end) < new Date(start)) {
        this.form.patchValue({ endDate: null });
      }
    });

    if (this.isEditMode && this.bookingId) {
      // In edit mode: merchants must be ready before we can restore the selection
      this.loadMerchants().then(() => this.loadBooking());
    } else {
      this.loadMerchants();
      this.addRoom();
    }
  }

  private async loadMerchants() {
    this.merchantsLoading = true;
    try {
      const raw = await this.service.getMerchants();
      this.merchants = raw.sort((a, b) => a.name.localeCompare(b.name));
      this.filteredMerchants = this.merchants;
      this.merchantSearchCtrl.valueChanges.subscribe((search) => {
        const q = (search ?? '').toLowerCase();
        this.filteredMerchants = this.merchants.filter((m) => m.name.toLowerCase().includes(q));
      });
    } catch {
      this.merchants = [];
      this.filteredMerchants = [];
    } finally {
      this.merchantsLoading = false;
    }
  }

  async onMerchantSelected(merchant: any) {
    this.selectedMerchant = merchant;
    this.merchantCtrl.setValue(merchant, { emitEvent: false });
    this.selectedHotel = null;
    this.hotels = [];
    this.form.patchValue({ hotelMarketId: null });
    this.clearResults();
    this.hotelsLoading = true;
    try {
      await this.loadMerchantHotels(merchant.id);
    } catch {
      this.setHotels([]);
    } finally {
      this.hotelsLoading = false;
    }
  }

  // /erp/availability only accepts the externalHotelId from /erp/merchants/{id}/hotels,
  // so expose that as the option value (code) instead of the hotel-list catalog code.
  private async loadMerchantHotels(merchantId: number): Promise<void> {
    const hotels = await this.service.getMerchantHotels(merchantId);
    this.setHotels(
      (hotels ?? [])
        .filter((h: any) => h.active !== false)
        .map((h: any) => ({ code: h.externalHotelId, name: h.name }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    );
  }

  private setHotels(hotels: any[]) {
    this.hotels = hotels;
    this.filteredHotels = hotels;
    this.hotelSearchCtrl.setValue('', { emitEvent: false });
  }

  compareMerchants(a: any, b: any): boolean {
    return a && b ? a.externalMerchantId === b.externalMerchantId : a === b;
  }

  onHotelSelected(code: string) {
    this.selectedHotel = this.hotels.find((h) => h.code === code) ?? null;
    // Results on screen belong to the previously searched hotel
    this.clearResults();
  }

  private clearResults() {
    this.valuationResults = [];
    this.rawValuationResult = [];
    this.selectedOffers = {};
    this.mealPlanFilter = null;
    this.form.patchValue({ totalPrice: 0 });
  }

  private initForm() {
    this.form = this.fb.group({
      // Required to save a booking, but not to search for offers (see calculatePrice)
      guestName: ['', Validators.required],
      fileRef: ['', Validators.required],
      hotelMarketId: [null, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      rooms: this.fb.array([]),
      totalPrice: [0],
    });
  }

  get roomsArray() {
    return this.form.get('rooms') as FormArray;
  }

  get resultsByRoom(): { roomCandidateId: number; results: any[] }[] {
    const map = new Map<number, any[]>();
    for (const r of this.valuationResults) {
      if (!map.has(r.roomCandidateId)) map.set(r.roomCandidateId, []);
      map.get(r.roomCandidateId)!.push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roomCandidateId, results]) => ({ roomCandidateId, results }));
  }

  // Distinct meal plans across all results, in order of appearance
  get availableMealPlans(): string[] {
    const plans: string[] = [];
    for (const r of this.valuationResults) {
      if (!plans.includes(r.mealPlan)) plans.push(r.mealPlan);
    }
    return plans;
  }

  onMealPlanFilterChange(plan: string) {
    this.mealPlanFilter = plan;
    // Picks belong to a meal plan, so they don't survive switching the filter
    this.selectedOffers = {};
    this.form.patchValue({ totalPrice: 0 });
  }

  // One card per distinct room type (a room candidate can offer several room
  // types) with the promotion options of the active meal plan filter —
  // "No promotion" before promotional variants.
  get offerCards(): {
    key: string;
    roomCandidateId: number;
    roomId: number;
    roomName: string;
    options: any[];
  }[] {
    const rooms = new Map<
      string,
      { roomCandidateId: number; roomId: number; roomName: string; options: any[] }
    >();

    for (const r of this.valuationResults) {
      if (this.mealPlanFilter && r.mealPlan !== this.mealPlanFilter) continue;
      const key = `${r.roomCandidateId}__${r.roomId}`;
      if (!rooms.has(key)) {
        rooms.set(key, {
          roomCandidateId: r.roomCandidateId,
          roomId: r.roomId,
          roomName: r.roomName,
          options: [],
        });
      }
      rooms.get(key)!.options.push(r);
    }

    return Array.from(rooms.entries())
      .sort(([, a], [, b]) => a.roomCandidateId - b.roomCandidateId || a.roomId - b.roomId)
      .map(([key, room]) => ({
        key,
        roomCandidateId: room.roomCandidateId,
        roomId: room.roomId,
        roomName: room.roomName,
        options: [...room.options].sort(
          (a, b) => Number(a.isDiscounted) - Number(b.isDiscounted),
        ),
      }));
  }

  // Opens a dialog showing the promotion's full description (HTML).
  openPromotionInfo(offer: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.dialog.open(PromotionInfoDialogComponent, {
      data: {
        title: this.promoLabel(offer),
        description: offer.description ?? null,
      },
      width: '560px',
    });
  }

  // Label for a promotion checkbox, e.g. "Early Booking Offer 25%" or "No promotion".
  promoLabel(offer: any): string {
    if (!offer.isDiscounted) return 'No promotion';
    return offer.discount != null ? `${offer.promotion} ${offer.discount}%` : offer.promotion;
  }

  isSelected(offer: any): boolean {
    return this.selectedOffers[offer.roomCandidateId] === offer;
  }

  // The selected offer belonging to a given room card (if any).
  selectedOfferForRoom(roomCandidateId: number, roomId: number): any {
    const sel = this.selectedOffers[roomCandidateId];
    return sel && sel.roomId === roomId ? sel : null;
  }

  getPaxArray(roomIndex: number) {
    return this.roomsArray.at(roomIndex).get('paxes') as FormArray;
  }

  addRoom() {
    const roomGroup = this.fb.group({
      // We keep candidate ID internal for tracking
      roomCandidateId: [this.roomsArray.length, Validators.required],
      paxes: this.fb.array([]),
    });
    this.roomsArray.push(roomGroup);
    this.addPax(this.roomsArray.length - 1, 30);
    this.addPax(this.roomsArray.length - 1, 30);
  }

  removeRoom(index: number) {
    this.roomsArray.removeAt(index);
  }

  addPax(roomIndex: number, defaultAge = 30) {
    const paxes = this.getPaxArray(roomIndex);
    paxes.push(
      this.fb.group({
        age: [defaultAge, Validators.required],
      }),
    );
  }

  removePax(roomIndex: number, paxIndex: number) {
    this.getPaxArray(roomIndex).removeAt(paxIndex);
  }

  async loadBooking() {
    if (!this.bookingId) return;
    const data = await firstValueFrom(this.service.get(this.bookingId));
    if (!data) return;

    console.log(
      '[loadBooking] externalMerchantId:',
      data.externalMerchantId,
      '| merchants loaded:',
      this.merchants.length,
      '| hotelMarketId:',
      data.hotelMarketId,
    );

    // Restore merchant + hotel selections
    if (data.externalMerchantId) {
      const merchant = this.merchants.find((m) => m.externalMerchantId === data.externalMerchantId);
      console.log('[loadBooking] merchant found:', merchant?.name ?? 'NOT FOUND');
      if (merchant) {
        this.selectedMerchant = merchant;
        this.merchantCtrl.setValue(merchant, { emitEvent: false });
      }
      try {
        if (merchant) {
          await this.loadMerchantHotels(merchant.id);
        } else {
          this.setHotels([]);
        }
      } catch {
        this.setHotels([]);
      }
    }

    this.form.patchValue({
      guestName: data.guestName,
      fileRef: data.fileRef ?? '',
      hotelMarketId: data.hotelMarketId,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      totalPrice: data.totalPrice,
    });

    // Rebuild the rooms array from saved data
    this.roomsArray.clear();
    if (data.valuationRequest?.roomCandidates) {
      data.valuationRequest.roomCandidates.forEach((rc: any, index: number) => {
        const roomGroup = this.fb.group({
          roomCandidateId: [index, Validators.required],
          paxes: this.fb.array([]),
        });

        const paxArray = roomGroup.get('paxes') as FormArray;
        rc.paxes.forEach((p: any) => {
          paxArray.push(
            this.fb.group({
              age: [p.age, Validators.required],
            }),
          );
        });
        this.roomsArray.push(roomGroup);
      });
    }

    if (data.valuationResult) {
      this.rawValuationResult = data.valuationResult;
      this.processResults(data.valuationResult);
      const restored = this.valuationResults.find((r) => r.price === data.totalPrice);
      this.selectedOffers = restored ? { [restored.roomCandidateId]: restored } : {};
      if (restored) this.mealPlanFilter = restored.mealPlan;
    }
  }

  async calculatePrice() {
    // Searching only needs hotel, dates and rooms — guest name / file ref are save-time fields
    const searchControls = ['hotelMarketId', 'startDate', 'endDate', 'rooms'];
    if (searchControls.some((c) => this.form.get(c)?.invalid)) {
      searchControls.forEach((c) => this.form.get(c)?.markAllAsTouched());
      this.notification.showError('Please select hotel, dates and room occupancy');
      return;
    }
    if (!this.selectedMerchant?.externalMerchantId || !this.form.value.hotelMarketId) {
      this.notification.showError('Please select a merchant and a hotel');
      return;
    }

    try {
      this.notification.showSuccess('Fetching available offers...');
      const val = this.form.value;
      const results = await this.service.getAvailability({
        externalMerchantId: this.selectedMerchant.externalMerchantId,
        externalHotelId: String(val.hotelMarketId),
        startDate: this.toApiDate(val.startDate),
        endDate: this.toApiDate(val.endDate),
        roomCandidates: val.rooms.map((r: any, rIndex: number) => ({
          id: rIndex + 1,
          paxes: r.paxes.map((p: any, pIndex: number) => ({ id: pIndex + 1, age: p.age })),
        })),
      });
      this.rawValuationResult = results;
      this.processResults(results);
      if (this.valuationResults.length > 0) {
        this.notification.showSuccess('Offers retrieved successfully!');
      } else {
        this.notification.showError('No offers available for the selected criteria.');
      }
    } catch (e) {
      console.error('Availability error:', e);
      this.notification.showError('Failed to fetch available offers.');
    }
  }

  // API expects plain YYYY-MM-DD; local date parts to avoid timezone off-by-one
  private toApiDate(d: Date): string {
    const date = new Date(d);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${day}`;
  }

  processResults(offers: any[]) {
    // New results invalidate previous picks (loadBooking restores its own afterwards)
    this.selectedOffers = {};
    // Reset up front so an empty response clears the previous search instead of
    // leaving stale offers on screen
    this.valuationResults = [];

    // Build a temporary array first to ensure Angular triggers change detection when we assign it
    const results: any[] = [];

    if (!offers || offers.length === 0) return;
    const hotelData = offers[0]; // The API returns an array containing the hotel object

    if (hotelData.availableRooms) {
      hotelData.availableRooms.forEach((room: any) => {
        // --- 1. Process Regular Prices (No Promotion) ---
        if (room.regularRoomPricesPerDays && room.mealPlans) {
          // Sum up the base room price across all days
          const baseRoomPrice = room.regularRoomPricesPerDays.reduce(
            (sum: number, day: any) => sum + day.price,
            0,
          );

          room.mealPlans.forEach((plan: any) => {
            // Sum up the meal plan price across all days (safeguard in case mealRates is missing)
            const baseMealPrice = plan.mealRates
              ? plan.mealRates.reduce((sum: number, day: any) => sum + day.pricePerDay, 0)
              : 0;

            // Quoted prices are rounded up to whole units
            const grandTotal = Math.ceil(baseRoomPrice + baseMealPrice);

            results.push({
              roomCandidateId: room.roomCandidateId,
              roomId: room.roomId,
              roomName: room.roomName,
              mealPlan: plan.name,
              promotion: 'None',
              price: grandTotal,
              isDiscounted: false,
              breakdown: this.createBreakdown(
                room.regularRoomPricesPerDays,
                plan.mealRates,
                undefined,
                plan.name,
              ),
            });
          });
        }

        // --- 2. Process Promotional Prices ---
        if (room.pricesPerDaysWithPromotion && room.pricesPerDaysWithPromotion.length > 0) {
          room.pricesPerDaysWithPromotion.forEach((promoPricing: any) => {
            // Calculate the discounted room total
            const discountedRoomPrice = promoPricing.roomPricesPerDays
              ? promoPricing.roomPricesPerDays.reduce((sum: number, day: any) => sum + day.price, 0)
              : 0;

            // Loop through the array of promotional meal plans
            if (
              promoPricing.mealPlansWithPricesPerDays &&
              promoPricing.mealPlansWithPricesPerDays.length > 0
            ) {
              promoPricing.mealPlansWithPricesPerDays.forEach((promoPlan: any) => {
                // Sum up the meal plan price across all days for this specific plan
                const mealPrice = promoPlan.mealPlanPricesPerDays
                  ? promoPlan.mealPlanPricesPerDays.reduce(
                      (sum: number, day: any) => sum + day.pricePerDay,
                      0,
                    )
                  : 0;

                const grandTotal = Math.ceil(discountedRoomPrice + mealPrice);

                // The promotion details now live on the pricing entry itself.
                // Prefer the "full" fields, which reflect combined promotions
                // (e.g. "Long Stay Offer + Early Bird Offer" at "discount: 19%").
                const promo = promoPricing.promotion;
                const fullDiscountText = promoPricing.promotionFullDiscountAndFlatRate as
                  | string
                  | undefined;
                const parsedDiscount = fullDiscountText
                  ? Number((fullDiscountText.match(/(\d+(?:\.\d+)?)\s*%/) || [])[1])
                  : NaN;
                const discount = !Number.isNaN(parsedDiscount)
                  ? parsedDiscount
                  : (promo?.periods?.[0]?.discount ?? null);

                results.push({
                  roomCandidateId: room.roomCandidateId,
                  roomId: room.roomId,
                  roomName: room.roomName,
                  mealPlan: promoPlan.name, // The JSON provides the meal plan name here
                  promotion:
                    promoPricing.promotionFullName || promo?.name || 'Promotional Offer',
                  promotionType: promo?.type ?? null,
                  description: promo?.description ?? null,
                  discount: discount,
                  price: grandTotal,
                  isDiscounted: true,
                  // Discount text ("discount: 19%")
                  discountText:
                    discount != null
                      ? `${discount}%`
                      : fullDiscountText || 'Discount Applied',
                  breakdown: this.createBreakdown(
                    promoPricing.roomPricesPerDays,
                    promoPlan.mealPlanPricesPerDays,
                    room.regularRoomPricesPerDays,
                    promoPlan.name,
                  ),
                });
              });
            }
          });
        }
      });
    }

    // Reassign the array reference so Angular's @if block detects the change instantly
    this.valuationResults = [...results];

    // Keep the meal plan filter valid for the new results, defaulting to the first plan
    const plans = this.availableMealPlans;
    if (!this.mealPlanFilter || !plans.includes(this.mealPlanFilter)) {
      this.mealPlanFilter = plans[0] ?? null;
    }
  }

  private createBreakdown(
    roomPrices: any[],
    mealPrices?: any[],
    originalRoomPrices?: any[],
    mealPlanName?: string,
  ) {
    if (!roomPrices) return [];

    return roomPrices.map((rp, index) => {
      const mealPrice = mealPrices ? mealPrices[index] : null;
      const original = originalRoomPrices ? originalRoomPrices[index] : null;
      const mealPerDay = mealPrice ? mealPrice.pricePerDay : 0;

      return {
        date: rp.date,
        // Falls back to the room price itself when there is no discount
        originalRoomPrice: original ? original.price : rp.price,
        roomPrice: rp.price,
        roomFormula: rp.formula,
        mealPlanName: mealPlanName ?? null,
        mealPrice: mealPerDay,
        total: rp.price + mealPerDay,
      };
    });
  }

  openDetails(offer: any) {
    this.dialog.open(PriceDetailsDialogComponent, {
      data: {
        offerName: offer.isDiscounted ? offer.promotion : 'No promotion',
        discountText: offer.isDiscounted ? `discount: ${offer.discountText}` : null,
        isDiscounted: offer.isDiscounted,
        currency: this.rawValuationResult[0]?.currency || 'EUR',
        rows: offer.breakdown,
        total: offer.price,
      },
      width: '760px',
    });
  }

  selectOption(option: any) {
    this.selectedOffers = { ...this.selectedOffers, [option.roomCandidateId]: option };
    const total = Object.values(this.selectedOffers).reduce((sum, o) => sum + o.price, 0);
    this.form.patchValue({ totalPrice: total });
  }

  async onSave() {
    if (this.form.invalid) return;
    const val = this.form.value;

    const requestData = {
      startDate: new Date(val.startDate).toISOString(),
      endDate: new Date(val.endDate).toISOString(),
      availDestinations: [{ type: 'HOT', code: val.hotelMarketId.toString() }],
      // Same 1-based ids as the availability request in calculatePrice
      roomCandidates: val.rooms.map((r: any, rIndex: number) => ({
        id: rIndex + 1,
        paxes: r.paxes.map((p: any, pIndex: number) => ({ id: pIndex + 1, age: p.age })),
      })),
    };

    const docData: Partial<Accommodation> = {
      guestName: val.guestName,
      fileRef: val.fileRef || '',
      externalMerchantId: this.selectedMerchant?.externalMerchantId ?? '',
      hotelName:
        this.hotels.find((h) => h.code === val.hotelMarketId)?.name ||
        this.rawValuationResult[0]?.name ||
        `Hotel ${val.hotelMarketId}`,
      hotelMarketId: val.hotelMarketId,
      startDate: Timestamp.fromDate(val.startDate),
      endDate: Timestamp.fromDate(val.endDate),
      status: 'QUOTATION',
      totalPrice: val.totalPrice,
      currency: this.rawValuationResult[0]?.currency || 'EUR',
      valuationRequest: requestData as any,
      valuationResult: this.stripNestedArrays(this.rawValuationResult) as any,
    };

    try {
      if (this.isEditMode && this.bookingId) {
        await this.service.update(this.bookingId, docData);
        this.notification.showSuccess('Booking updated');
      } else {
        await this.service.add(docData as Accommodation);
        this.notification.showSuccess('Booking created');
      }
      this.router.navigate(['/accommodations']);
    } catch (e) {
      console.error(e);
      this.notification.showError('Error saving booking');
    }
  }

  private stripNestedArrays(value: any): any {
    if (Array.isArray(value)) {
      return value
        .filter((item) => !Array.isArray(item))
        .map((item) => this.stripNestedArrays(item));
    }
    if (value !== null && typeof value === 'object') {
      const out: any = {};
      for (const key of Object.keys(value)) {
        out[key] = this.stripNestedArrays(value[key]);
      }
      return out;
    }
    return value;
  }
}
