import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AccommodationService } from '../services/accommodation.service';
import { ListPageComponent } from '../../../shared/components/list-page/list-page';

interface MerchantRow {
  merchant: any;
  hotels: any[] | null;
  loading: boolean;
}

@Component({
  selector: 'app-merchant-hotel-list',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatIconModule,
    MatChipsModule,
    ListPageComponent,
  ],
  templateUrl: './merchant-hotel-list.html',
})
export class MerchantHotelListComponent implements OnInit {
  private service = inject(AccommodationService);

  rows: MerchantRow[] = [];
  loading = false;

  async ngOnInit() {
    this.loading = true;
    try {
      const merchants = await this.service.getMerchants();
      this.rows = merchants
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(merchant => ({ merchant, hotels: null, loading: false }));
    } finally {
      this.loading = false;
    }
  }

  async onExpand(row: MerchantRow) {
    if (row.hotels !== null) return;
    row.loading = true;
    try {
      const result = await this.service.getMerchantHotelList(row.merchant.externalMerchantId);
      row.hotels = result.hotels ?? [];
    } catch {
      row.hotels = [];
    } finally {
      row.loading = false;
    }
  }
}
