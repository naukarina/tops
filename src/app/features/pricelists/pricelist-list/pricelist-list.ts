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

  displayedColumns = [
    'name',
    'currencyName',
    'tourOperatorNames',
    'periods', // <-- Replaced validityFrom and validityTo with the new column
    'actions',
  ];

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
    // NEW: Dynamically build a string showing all periods formatted clearly
    {
      columnDef: 'periods',
      header: 'Periods (From - To)',
      cell: (p) => {
        if (!p.periods || p.periods.length === 0) return 'No periods';

        return p.periods
          .map((period, index) => {
            const dateFrom = period.validityFrom?.toDate
              ? period.validityFrom.toDate()
              : new Date(period.validityFrom);
            const dateTo = period.validityTo?.toDate
              ? period.validityTo.toDate()
              : new Date(period.validityTo);

            // Updated date format here
            const fromStr = this.datePipe.transform(dateFrom, 'dd/MM/yyyy');
            const toStr = this.datePipe.transform(dateTo, 'dd/MM/yyyy');

            return `${index > 0 ? ' ' : ''}${fromStr} - ${toStr} (${period.pricelistProducts.length})`;
          })
          .join('\n'); // Replaced ' | ' with a newline character
      },
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

  onExport(selectedPricelists: PricelistWithDetails[]) {
    // Check if there's anything to export
    if (!selectedPricelists || selectedPricelists.length === 0) {
      this.notificationService.showError('No pricelists selected for export.');
      return;
    }

    let exportedCount = 0;

    selectedPricelists.forEach((pricelist) => {
      // Skip if the pricelist has no periods
      if (!pricelist.periods || pricelist.periods.length === 0) return;

      pricelist.periods.forEach((period, index) => {
        // 1. Format Dates for the filename
        const dateFrom = period.validityFrom?.toDate
          ? period.validityFrom.toDate()
          : new Date(period.validityFrom);
        const dateTo = period.validityTo?.toDate
          ? period.validityTo.toDate()
          : new Date(period.validityTo);
        const fromStr = this.datePipe.transform(dateFrom, 'yyyy-MM-dd') || 'start';
        const toStr = this.datePipe.transform(dateTo, 'yyyy-MM-dd') || 'end';

        // 2. Build the CSV content matching your import format
        let csvContent = 'productId,displayName,price\n';

        if (period.pricelistProducts) {
          period.pricelistProducts.forEach((product) => {
            // Safely escape quotes in names (e.g., if a product is named 5" Screen)
            const safeName = product.displayName
              ? `"${product.displayName.replace(/"/g, '""')}"`
              : '""';
            csvContent += `${product.baseProductId},${safeName},${product.price}\n`;
          });
        }

        // 3. Create a Blob and trigger the download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Clean up the pricelist name so it's safe for Windows/Mac filenames
        const safePricelistName = pricelist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        // Example filename: summer_2024_period_1_2024-06-01_to_2024-10-31.csv
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `${safePricelistName}_period_${index + 1}_${fromStr}_to_${toStr}.csv`,
        );
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        exportedCount++;
      });
    });

    if (exportedCount > 0) {
      this.notificationService.showSuccess(`Exported ${exportedCount} period CSV(s) successfully.`);
    } else {
      this.notificationService.showError('No periods found in the selected pricelist(s).');
    }
  }
}
