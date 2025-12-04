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
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // Added MatDialog

// App Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { AccommodationService } from '../../../services/accommodation.service';
import { NotificationService } from '../../../services/notification.service';
import {
  Accommodation,
  ValuationRequest,
  HotelOffer,
  PricePerDay,
  MealRate,
} from '../../../models/accommodation.model';
import { PriceDetailsDialogComponent, PriceDetailsData } from './price-details-dialog';

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
    MatDialogModule, // Added
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
  private dialog = inject(MatDialog); // Inject Dialog

  form!: FormGroup;
  isEditMode = false;
  bookingId: string | null = null;

  valuationResults: any[] = [];
  rawValuationResult: HotelOffer[] = [];

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
      hotelMarketId: [1, Validators.required],
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
      roomCandidateId: [this.roomsArray.length + 1, Validators.required],
      paxes: this.fb.array([]),
    });
    this.roomsArray.push(roomGroup);
    this.addPax(this.roomsArray.length - 1, 50);
    this.addPax(this.roomsArray.length - 1, 50);
  }

  removeRoom(index: number) {
    this.roomsArray.removeAt(index);
  }

  addPax(roomIndex: number, defaultAge = 30) {
    const paxes = this.getPaxArray(roomIndex);
    paxes.push(
      this.fb.group({
        id: [paxes.length + 1],
        age: [defaultAge, Validators.required],
      })
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
      hotelMarketId: data.valuationRequest.availDestinations?.[0]?.code || data.hotelMarketId,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      totalPrice: data.totalPrice,
    });

    this.roomsArray.clear();
    if (data.valuationRequest.roomCandidates) {
      data.valuationRequest.roomCandidates.forEach((rc) => {
        const roomGroup = this.fb.group({
          roomCandidateId: [rc.id, Validators.required],
          paxes: this.fb.array([]),
        });

        const paxArray = roomGroup.get('paxes') as FormArray;
        rc.paxes.forEach((p) => {
          paxArray.push(
            this.fb.group({
              id: [p.id],
              age: [p.age, Validators.required],
            })
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

  async calculatePrice() {
    if (this.form.invalid) {
      this.notification.showError('Please fill all required fields');
      return;
    }
    const val = this.form.value;

    const request: ValuationRequest = {
      startDate: this.formatDate(val.startDate),
      endDate: this.formatDate(val.endDate),
      availDestinations: [
        {
          type: 'HOT',
          code: val.hotelMarketId,
        },
      ],
      roomCandidates: val.rooms.map((r: any) => ({
        id: r.roomCandidateId,
        paxes: r.paxes,
      })),
    };

    try {
      const results = await this.service.getRoomPrices(5, request); // ID 5 hardcoded as per API example
      this.rawValuationResult = results;
      this.processResults(results);
      this.notification.showSuccess('Valuation successful');
    } catch (e) {
      console.error(e);
      this.notification.showError('Failed to calculate price');
    }
  }

  processResults(offers: HotelOffer[]) {
    this.valuationResults = [];

    offers.forEach((offer) => {
      offer.availableRooms.forEach((room) => {
        // 1. Regular prices (no promotion)
        room.mealPlans.forEach((plan) => {
          this.valuationResults.push({
            roomCandidateId: room.roomCandidateId,
            roomId: room.roomId,
            offerName: offer.name,
            mealPlan: plan.name,
            promotion: 'None',
            price: plan.price,
            isDiscounted: false,
            // Attach detailed breakdown for the dialog
            breakdown: this.createBreakdown(room.regularRoomPricesPerDays, plan.mealRates),
          });
        });

        // 2. Promotion prices
        room.pricesPerDaysWithPromotion.forEach((promoPrice) => {
          const promoName = promoPrice.promotion.name;

          promoPrice.mealPlansWithPricesPerDays.forEach((plan) => {
            this.valuationResults.push({
              roomCandidateId: room.roomCandidateId,
              roomId: room.roomId,
              offerName: offer.name,
              mealPlan: plan.name,
              promotion: promoName,
              price: plan.price,
              isDiscounted: true,
              discount: promoPrice.promotion.discount,
              // Attach detailed breakdown for the dialog
              breakdown: this.createBreakdown(
                promoPrice.roomPricesPerDays,
                plan.mealPlanPricesPerDays
              ),
            });
          });
        });
      });
    });
  }

  // Helper to merge room and meal prices into a flat list for the dialog
  private createBreakdown(roomPrices: PricePerDay[], mealPrices?: MealRate[]) {
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

  // Open the details dialog
  openDetails(offer: any) {
    const rows = offer.breakdown.map((b: any) => ({
      date: b.date,
      description: `Room: ${b.roomFormula} ${b.mealPrice > 0 ? '+ Meal: ' + b.mealPrice : ''}`,
      price: b.total,
      formula: b.roomFormula,
    }));

    this.dialog.open(PriceDetailsDialogComponent, {
      data: {
        title: `${offer.offerName} - ${offer.mealPlan} (${offer.promotion})`,
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

    const requestData: ValuationRequest = {
      startDate: this.formatDate(val.startDate),
      endDate: this.formatDate(val.endDate),
      availDestinations: [{ type: 'HOT', code: val.hotelMarketId }],
      roomCandidates: val.rooms.map((r: any) => ({ id: r.roomCandidateId, paxes: r.paxes })),
    };

    const docData: Partial<Accommodation> = {
      guestName: val.guestName,
      hotelName: this.rawValuationResult[0]?.name || `Hotel ${val.hotelMarketId}`,
      hotelMarketId: val.hotelMarketId,
      startDate: Timestamp.fromDate(val.startDate),
      endDate: Timestamp.fromDate(val.endDate),
      status: val.status,
      totalPrice: val.totalPrice,
      currency: 'EUR',
      valuationRequest: requestData,
      valuationResult: this.rawValuationResult,
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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}
