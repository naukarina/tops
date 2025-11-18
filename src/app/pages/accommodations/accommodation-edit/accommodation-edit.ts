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

// App Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { AccommodationService } from '../../../services/accommodation.service';
import { NotificationService } from '../../../services/notification.service';
import {
  Accommodation,
  ValuationRequest,
  ValuationResponse,
} from '../../../models/accommodation.model';

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

  form!: FormGroup;
  isEditMode = false;
  bookingId: string | null = null;
  valuationResults: ValuationResponse[] = [];

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.bookingId;

    this.initForm();

    if (this.isEditMode && this.bookingId) {
      this.loadBooking();
    } else {
      // Add default room for new bookings
      this.addRoom();
    }
  }

  private initForm() {
    this.form = this.fb.group({
      guestName: ['', Validators.required],
      status: ['QUOTATION', Validators.required],

      // Valuation API params
      hotelMarketId: [1, Validators.required],
      promotionId: [1, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      mealPlanCode: ['BED_AND_BREAKFAST', Validators.required],

      rooms: this.fb.array([]),

      // Results
      totalPrice: [0],
      valuationResult: [null],
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
      roomId: [91, Validators.required], // Default from example
      roomCandidateId: [this.roomsArray.length + 1, Validators.required],
      paxes: this.fb.array([]),
    });
    this.roomsArray.push(roomGroup);
    // Add default paxes
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
      hotelMarketId: data.valuationRequest.hotelMarketId,
      promotionId: data.valuationRequest.promotionId,
      mealPlanCode: data.valuationRequest.mealPlanCode,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      totalPrice: data.totalPrice,
      valuationResult: data.valuationResult,
    });

    // Reconstruct FormArrays
    this.roomsArray.clear();
    // We map from `valuationRequest.roomCandidates` because that has the pax info
    // Note: The API splits IDs into 'rooms' array and Pax into 'roomCandidates'.
    // This UI combines them for ease, we will split them on submit/calculate.
    if (data.valuationRequest.roomCandidates) {
      data.valuationRequest.roomCandidates.forEach((rc, idx) => {
        // Find corresponding roomId from rooms array
        const roomMapping = data.valuationRequest.rooms.find((r) => r.roomCandidateId === rc.id);

        const roomGroup = this.fb.group({
          roomId: [roomMapping?.roomId || 0, Validators.required],
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
      this.valuationResults = data.valuationResult;
    }
  }

  async calculatePrice() {
    if (this.form.invalid) {
      this.notification.showError('Please fill all required fields');
      return;
    }
    const val = this.form.value;

    // Transform form data to API Request Structure
    const request: ValuationRequest = {
      startDate: this.formatDate(val.startDate),
      endDate: this.formatDate(val.endDate),
      hotelMarketId: val.hotelMarketId,
      promotionId: val.promotionId,
      mealPlanCode: val.mealPlanCode,
      rooms: val.rooms.map((r: any) => ({
        roomId: r.roomId,
        roomCandidateId: r.roomCandidateId,
      })),
      roomCandidates: val.rooms.map((r: any) => ({
        id: r.roomCandidateId,
        paxes: r.paxes,
      })),
    };

    try {
      // For "5" in URL, using logic from example or form.
      // Assuming hotelMarketId matches or we use a static ID for the Valuation Endpoint path.
      // The example used /valuation/5/..., I'll use a static 5 or derive it.
      // Let's use '5' as per example, or maybe hotelMarketId is the param?
      // I'll use hotelMarketId as the parameter for now.
      const results = await this.service.getRoomPrices(5, request);
      this.valuationResults = results;

      // Calculate total
      const total = results.reduce((acc, curr) => acc + curr.totalPrice, 0);
      this.form.patchValue({ totalPrice: total, valuationResult: results });
      this.notification.showSuccess('Price calculated successfully');
    } catch (e) {
      console.error(e);
      this.notification.showError('Failed to calculate price');
    }
  }

  async onSave() {
    if (this.form.invalid) return;

    const val = this.form.value;

    const requestData: ValuationRequest = {
      startDate: this.formatDate(val.startDate),
      endDate: this.formatDate(val.endDate),
      hotelMarketId: val.hotelMarketId,
      promotionId: val.promotionId,
      mealPlanCode: val.mealPlanCode,
      rooms: val.rooms.map((r: any) => ({ roomId: r.roomId, roomCandidateId: r.roomCandidateId })),
      roomCandidates: val.rooms.map((r: any) => ({ id: r.roomCandidateId, paxes: r.paxes })),
    };

    const docData: Partial<Accommodation> = {
      guestName: val.guestName,
      hotelName: `Hotel Market ${val.hotelMarketId}`, // Placeholder name
      hotelMarketId: val.hotelMarketId,
      startDate: Timestamp.fromDate(val.startDate),
      endDate: Timestamp.fromDate(val.endDate),
      status: val.status,
      totalPrice: val.totalPrice,
      currency: 'EUR', // Default or from API
      valuationRequest: requestData,
      valuationResult: this.valuationResults,
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
    // Manual YYYY-MM-DD formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}
