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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { parseOffers } from '../accommodations/services/offer-parser';
import { PriceDetailsDialogComponent } from '../accommodations/accommodation-edit/price-details-dialog';
import { PromotionInfoDialogComponent } from '../accommodations/accommodation-edit/promotion-info-dialog';
import { B2bHotel, B2bPricingService } from './b2b-pricing.service';

@Component({
  selector: 'app-b2b-pricing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './b2b-pricing.html',
  styleUrls: ['./b2b-pricing.scss'],
  providers: [DecimalPipe],
})
export class B2bPricingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(B2bPricingService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  authService = inject(AuthService);

  form!: FormGroup;
  hotels: B2bHotel[] = [];
  filteredHotels: B2bHotel[] = [];
  hotelSearchCtrl = new FormControl('');
  hotelsLoading = false;
  searching = false;

  results: any[] = [];
  currency = 'EUR';
  mealPlanFilter: string | null = null;
  // What the displayed results were searched for (the form may change afterwards)
  searched: { hotel: string; start: Date; end: Date; nights: number; rooms: number } | null = null;

  ngOnInit() {
    this.form = this.fb.group({
      externalHotelId: [null, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      rooms: this.fb.array([]),
    });
    this.addRoom();

    this.hotelSearchCtrl.valueChanges.subscribe((search) => {
      const q = (search ?? '').toLowerCase();
      this.filteredHotels = this.hotels.filter((h) => h.name.toLowerCase().includes(q));
    });
    this.form.get('startDate')!.valueChanges.subscribe((start) => {
      const end = this.form.get('endDate')?.value;
      if (start && end && new Date(end) < new Date(start)) {
        this.form.patchValue({ endDate: null });
      }
    });
    this.form.get('externalHotelId')!.valueChanges.subscribe(() => this.clearResults());

    this.loadHotels();
  }

  private async loadHotels() {
    this.hotelsLoading = true;
    try {
      const hotels = await this.service.getHotels();
      this.hotels = [...hotels].sort((a, b) => a.name.localeCompare(b.name));
      this.filteredHotels = this.hotels;
    } catch (e) {
      console.error('Failed to load hotels', e);
      this.notification.showError('Could not load your hotels.');
    } finally {
      this.hotelsLoading = false;
    }
  }

  get roomsArray() {
    return this.form.get('rooms') as FormArray;
  }

  getPaxArray(roomIndex: number) {
    return this.roomsArray.at(roomIndex).get('paxes') as FormArray;
  }

  addRoom() {
    this.roomsArray.push(this.fb.group({ paxes: this.fb.array([]) }));
    const i = this.roomsArray.length - 1;
    this.addPax(i, 30);
    this.addPax(i, 30);
  }

  removeRoom(index: number) {
    this.roomsArray.removeAt(index);
  }

  addPax(roomIndex: number, defaultAge = 30) {
    this.getPaxArray(roomIndex).push(
      this.fb.group({ age: [defaultAge, [Validators.required, Validators.min(0)]] }),
    );
  }

  removePax(roomIndex: number, paxIndex: number) {
    this.getPaxArray(roomIndex).removeAt(paxIndex);
  }

  private clearResults() {
    this.results = [];
    this.mealPlanFilter = null;
    this.searched = null;
  }

  async search() {
    if (this.form.invalid || this.roomsArray.length === 0) {
      this.form.markAllAsTouched();
      this.notification.showError('Please select hotel, dates and room occupancy');
      return;
    }
    const val = this.form.value;
    this.searching = true;
    this.clearResults();
    try {
      const raw = await this.service.getPrices({
        externalHotelId: String(val.externalHotelId),
        startDate: this.toApiDate(val.startDate),
        endDate: this.toApiDate(val.endDate),
        roomCandidates: val.rooms.map((r: any, rIndex: number) => ({
          id: rIndex + 1,
          paxes: r.paxes.map((p: any, pIndex: number) => ({ id: pIndex + 1, age: p.age })),
        })),
      });
      this.currency = raw?.[0]?.currency || 'EUR';
      this.results = parseOffers(raw);
      const start = new Date(val.startDate);
      const end = new Date(val.endDate);
      this.searched = {
        hotel: this.hotels.find((h) => h.externalHotelId === val.externalHotelId)?.name ?? '',
        start,
        end,
        nights: Math.round((end.getTime() - start.getTime()) / 86400000),
        rooms: val.rooms.length,
      };
      this.mealPlanFilter = this.availableMealPlans[0] ?? null;
      if (this.results.length === 0) {
        this.notification.showError('No offers available for the selected criteria.');
      }
    } catch (e) {
      console.error('Availability error:', e);
      this.clearResults();
      this.notification.showError('Failed to fetch prices.');
    } finally {
      this.searching = false;
    }
  }

  // API expects plain YYYY-MM-DD; local date parts to avoid timezone off-by-one
  private toApiDate(d: Date): string {
    const date = new Date(d);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${day}`;
  }

  get availableMealPlans(): string[] {
    return [...new Set(this.results.map((r) => r.mealPlan as string))];
  }

  // One card per room candidate + room type, listing the offers of the active meal plan
  get offerCards(): { key: string; roomCandidateId: number; roomName: string; options: any[] }[] {
    const cards = new Map<
      string,
      { key: string; roomCandidateId: number; roomName: string; options: any[] }
    >();
    for (const r of this.results) {
      if (this.mealPlanFilter && r.mealPlan !== this.mealPlanFilter) continue;
      const key = `${r.roomCandidateId}__${r.roomId}`;
      if (!cards.has(key)) {
        cards.set(key, {
          key,
          roomCandidateId: r.roomCandidateId,
          roomName: r.roomName,
          options: [],
        });
      }
      cards.get(key)!.options.push(r);
    }
    return [...cards.values()]
      .sort((a, b) => a.roomCandidateId - b.roomCandidateId)
      .map((c) => ({
        ...c,
        options: [...c.options].sort((a, b) => Number(a.isDiscounted) - Number(b.isDiscounted)),
      }));
  }

  promoLabel(offer: any): string {
    if (!offer.isDiscounted) return 'No promotion';
    return offer.discount != null ? `${offer.promotion} ${offer.discount}%` : offer.promotion;
  }

  openPromotionInfo(offer: any) {
    this.dialog.open(PromotionInfoDialogComponent, {
      data: { title: this.promoLabel(offer), description: offer.description ?? null },
      width: '560px',
    });
  }

  openDetails(offer: any) {
    this.dialog.open(PriceDetailsDialogComponent, {
      data: {
        offerName: offer.isDiscounted ? offer.promotion : 'No promotion',
        discountText: offer.isDiscounted ? `discount: ${offer.discountText}` : null,
        isDiscounted: offer.isDiscounted,
        currency: this.currency,
        rows: offer.breakdown,
        total: offer.price,
      },
      width: '760px',
    });
  }
}
