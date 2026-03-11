import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';

// Services & Models
import { NotificationService } from '../../../core/services/notification.service';
import { Pricelist } from '../models/pricelist.model';
import { PricelistService } from '../services/pricelist.service';
import { PartnerService } from '../../partners/services/partner.service';

// Extended interface to hold our calculated fields for the table
export interface PricelistWithDetails extends Pricelist {
  tourOperatorNames: string;
  productCount: number;
}

@Component({
  selector: 'app-pricelist-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ListPageComponent, DataTableComponent],
  templateUrl: './pricelist-list.html',
  styleUrls: ['./pricelist-list.scss'],
  providers: [DatePipe], // Added to format Firebase dates in the table
})
export class PricelistListComponent {
  private pricelistService = inject(PricelistService);
  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  // Combine Pricelists and Partners to resolve Tour Operator names
  pricelists$: Observable<PricelistWithDetails[]> = combineLatest([
    this.pricelistService.getAll(),
    this.partnerService.getAll(),
  ]).pipe(
    map(([pricelists, partners]) => {
      return pricelists.map((p) => {
        // Map tourOperatorIds to actual Partner names
        const names = (p.tourOperatorIds || [])
          .map((id) => {
            const partner = partners.find((partner) => partner.id === id);
            return partner ? partner.name : 'Unknown';
          })
          .join(', ');

        return {
          ...p,
          tourOperatorNames: names || 'None',
        } as PricelistWithDetails;
      });
    }),
  );

  displayedColumns = ['name', 'currencyName', 'tourOperatorNames', 'actions'];

  columnDefs: ColumnDefinition<PricelistWithDetails>[] = [
    { columnDef: 'name', header: 'Name', cell: (p) => p.name, isSortable: true },
    {
      columnDef: 'currencyName',
      header: 'Currency',
      cell: (p) => p.currencyName,
      isSortable: true,
    },
    {
      columnDef: 'tourOperatorNames',
      header: 'Tour Operators',
      cell: (p) => p.tourOperatorNames,
      isSortable: false,
    },
  ];

  viewRoute = (p: PricelistWithDetails) => ['/pricelists', p.id];
  editRoute = (p: PricelistWithDetails) => ['/pricelists', 'edit', p.id];

  async onDelete(pricelist: PricelistWithDetails) {
    if (confirm(`Are you sure you want to delete "${pricelist.name}"?`)) {
      try {
        if (pricelist.id) {
          await this.pricelistService.delete(pricelist.id);
          this.notificationService.showSuccess('Pricelist deleted successfully.');
        }
      } catch (error) {
        this.notificationService.showError('Failed to delete pricelist.');
      }
    }
  }
}
