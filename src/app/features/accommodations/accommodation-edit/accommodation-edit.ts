import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';

// Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// App Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { AccommodationService } from '../services/accommodation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Accommodation } from '../models/accommodation.model';
import { PriceDetailsDialogComponent } from './price-details-dialog';
import { HttpClient } from '@angular/common/http';

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
    EditPageComponent,
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

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.bookingId;

    this.initForm();

    if (this.isEditMode && this.bookingId) {
      this.loadBooking();
    } else {
      this.addRoom();
    }
  }

  private initForm() {
    this.form = this.fb.group({
      guestName: ['', Validators.required],
      status: ['QUOTATION', Validators.required],
      hotelMarketId: [27, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      rooms: this.fb.array([]),
      totalPrice: [0],
    });
  }

  get roomsArray() {
    return this.form.get('rooms') as FormArray;
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
    const data = await this.service.get(this.bookingId).toPromise();
    if (!data) return;

    this.form.patchValue({
      guestName: data.guestName,
      status: data.status,
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
    }
  }

  testKreolaPing() {
    const base = 'http://192.168.1.69:3100'; // your Mac, absolute URL — no proxy
    this.http
      .post<{ access_token: string }>(`${base}/auth/sign-in`, {
        email: 'admin@kreola-dev.com',
        password: 'secret',
      })
      .subscribe({
        next: ({ access_token }) => {
          this.http
            .get(`${base}/availability/ping`, {
              headers: { Authorization: `Bearer ${access_token}` },
            })
            .subscribe({
              next: (res) => console.log('✅ PING OK', res), // {status:'ok', service:'availability'}
              error: (err) => console.error('❌ PING FAILED', err),
            });
        },
        error: (err) => console.error('❌ SIGN-IN FAILED', err),
      });
  }

  async calculatePrice() {
    if (this.form.invalid) {
      this.notification.showError('Please fill all required fields');
      return;
    }
    const val = this.form.value;

    const requestPayload = {
      merchantCountry: 'FR',
      availDestinations: [
        {
          type: 'HOT',
          code: val.hotelMarketId.toString(), // e.g., "27"
        },
      ],
      startDate: new Date(val.startDate).toISOString(),
      endDate: new Date(val.endDate).toISOString(),

      roomCandidates: val.rooms.map((r: any, rIndex: number) => ({
        id: rIndex,
        paxes: r.paxes.map((p: any, pIndex: number) => ({
          id: pIndex,
          age: p.age,
        })),
      })),
    };

    // The Kreola Merchant ID for the URL endpoint
    const merchantId = 133;

    try {
      this.notification.showSuccess('Fetching available offers...');

      // Pass the merchantId (133) for the URL, and the payload (containing hotel 27)
      const results = await this.service.getRoomPrices(merchantId, requestPayload);

      this.rawValuationResult = results;

      console.log('API Results:', results);
      this.processResults(results);
      this.notification.showSuccess('Offers retrieved successfully!');
    } catch (e) {
      console.error('API Error:', e);
      this.notification.showError('Failed to fetch available offers.');
    }
  }

  processResults(offers: any[]) {
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

            const grandTotal = baseRoomPrice + baseMealPrice;

            results.push({
              roomCandidateId: room.roomCandidateId,
              roomId: room.roomId,
              roomName: room.roomName,
              mealPlan: plan.name,
              promotion: 'None',
              price: grandTotal,
              isDiscounted: false,
              breakdown: this.createBreakdown(room.regularRoomPricesPerDays, plan.mealRates),
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

                const grandTotal = discountedRoomPrice + mealPrice;

                results.push({
                  roomCandidateId: room.roomCandidateId,
                  roomId: room.roomId,
                  roomName: room.roomName,
                  mealPlan: promoPlan.name, // The JSON provides the meal plan name here
                  // Safely grab the promotion name from the various places the API puts it
                  promotion: room.promotionFullName || room.promotion?.name || 'Promotional Offer',
                  price: grandTotal,
                  isDiscounted: true,
                  // Grab the discount text ("discount: 20%")
                  discountText: room.promotionFullDiscountAndFlatRate || 'Discount Applied',
                  breakdown: this.createBreakdown(
                    promoPricing.roomPricesPerDays,
                    promoPlan.mealPlanPricesPerDays,
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
  }

  private createBreakdown(roomPrices: any[], mealPrices?: any[]) {
    if (!roomPrices) return [];

    return roomPrices.map((rp, index) => {
      const mealPrice = mealPrices ? mealPrices[index] : null;
      const totalDaily = rp.price + (mealPrice ? mealPrice.pricePerDay : 0);

      return {
        date: rp.date,
        roomPrice: rp.price,
        roomFormula: rp.formula,
        mealPrice: mealPrice ? mealPrice.pricePerDay : 0,
        total: totalDaily,
      };
    });
  }

  openDetails(offer: any) {
    const rows = offer.breakdown.map((b: any) => ({
      date: b.date,
      description: `Room: ${b.roomFormula} ${b.mealPrice > 0 ? '+ Meal: ' + b.mealPrice : ''}`,
      price: b.total,
      formula: b.roomFormula,
    }));

    this.dialog.open(PriceDetailsDialogComponent, {
      data: {
        title: `${offer.roomName} - ${offer.mealPlan}`,
        rows: rows,
        total: offer.price,
      },
      width: '600px',
    });
  }

  selectOption(option: any) {
    this.form.patchValue({ totalPrice: option.price });
  }

  async onSave() {
    if (this.form.invalid) return;
    const val = this.form.value;

    const requestData = {
      startDate: new Date(val.startDate).toISOString(),
      endDate: new Date(val.endDate).toISOString(),
      availDestinations: [{ type: 'HOT', code: val.hotelMarketId.toString() }],
      roomCandidates: val.rooms.map((r: any, rIndex: number) => ({
        id: rIndex,
        paxes: r.paxes.map((p: any, pIndex: number) => ({ id: pIndex, age: p.age })),
      })),
    };

    const docData: Partial<Accommodation> = {
      guestName: val.guestName,
      hotelName: this.rawValuationResult[0]?.name || `Hotel ${val.hotelMarketId}`,
      hotelMarketId: val.hotelMarketId,
      startDate: Timestamp.fromDate(val.startDate),
      endDate: Timestamp.fromDate(val.endDate),
      status: val.status,
      totalPrice: val.totalPrice,
      currency: this.rawValuationResult[0]?.currency || 'EUR',
      valuationRequest: requestData as any,
      valuationResult: this.rawValuationResult as any,
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
}
