import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
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
import { ProductService } from '../../products/services/product.service';
import { ItemService } from '../../items/services/item.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { CurrencyName } from '../../../core/models/currency.model';

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
  providers: [DatePipe],
})
export class PricelistListComponent {
  private pricelistService = inject(PricelistService);
  private partnerService = inject(PartnerService);
  private productService = inject(ProductService);
  private itemService = inject(ItemService);
  private currencyService = inject(CurrencyService);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  pricelists$: Observable<PricelistWithDetails[]> = combineLatest([
    this.pricelistService.getAll(),
    this.partnerService.getAll(),
  ]).pipe(
    map(([pricelists, partners]) => {
      return pricelists.map((p) => {
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

  displayedColumns = ['name', 'currencyName', 'tourOperatorNames', 'periods', 'actions'];

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

            const fromStr = this.datePipe.transform(dateFrom, 'dd/MM/yyyy');
            const toStr = this.datePipe.transform(dateTo, 'dd/MM/yyyy');

            return `${index > 0 ? ' ' : ''}  ${fromStr} - ${toStr}`;
          })
          .join('\n');
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

  // --- NEW: Custom Export Logic with Cost Analysis ---
  async onExport(selectedPricelists: PricelistWithDetails[]) {
    if (!selectedPricelists || selectedPricelists.length === 0) {
      this.notificationService.showError('No pricelists selected for export.');
      return;
    }

    // Fetch the lookup data needed to run the calculations
    const allProducts = await firstValueFrom(this.productService.getAll());
    const allItems = await firstValueFrom(this.itemService.getAll());
    const allCurrencies = await firstValueFrom(this.currencyService.getAll());

    let exportedCount = 0;

    selectedPricelists.forEach((pricelist) => {
      if (!pricelist.periods || pricelist.periods.length === 0) return;

      pricelist.periods.forEach((period, index) => {
        const dateFrom = period.validityFrom?.toDate
          ? period.validityFrom.toDate()
          : new Date(period.validityFrom);
        const dateTo = period.validityTo?.toDate
          ? period.validityTo.toDate()
          : new Date(period.validityTo);
        const fromStr = this.datePipe.transform(dateFrom, 'yyyy-MM-dd') || 'start';
        const toStr = this.datePipe.transform(dateTo, 'yyyy-MM-dd') || 'end';

        // 1. Updated Headers to include the cost analysis fields
        let csvContent =
          'productId,displayName,price,originalPriceMUR,originalTotalCostMUR,originalNetProfitMUR,convertedCost,pricelistNetProfit\n';

        if (period.pricelistProducts) {
          period.pricelistProducts.forEach((product) => {
            const safeName = product.displayName
              ? `"${product.displayName.replace(/"/g, '""')}"`
              : '""';

            // 2. Execute Cost Analysis
            const orig = this.getOriginalProductDetails(
              product.baseProductId,
              allProducts,
              allItems,
            );
            let origPrice = 0,
              origTotalCost = 0,
              origNetProfit = 0,
              convertedCost = 0,
              plNetProfit = 0;

            if (orig) {
              origPrice = orig.price;
              origTotalCost = orig.totalCost;
              origNetProfit = orig.netProfit;
              convertedCost = this.convertMurToSelectedCurrency(
                orig.totalCost,
                pricelist.currencyName,
                allCurrencies,
              );
              plNetProfit = product.price - convertedCost;
            }

            // 3. Append to CSV
            csvContent += `${product.baseProductId},${safeName},${product.price},${origPrice.toFixed(2)},${origTotalCost.toFixed(2)},${origNetProfit.toFixed(2)},${convertedCost.toFixed(2)},${plNetProfit.toFixed(2)}\n`;
          });
        }

        // Generate download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const safePricelistName = pricelist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

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

  // --- CALCULATION HELPERS ---
  private getOriginalProductDetails(productId: string, allProducts: any[], allItems: any[]) {
    if (!productId) return null;
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return null;

    const price = product.validities?.length
      ? product.validities[product.validities.length - 1].price
      : 0;
    let itemsCost = 0;
    (product.itemIds || []).forEach((itemId: string) => {
      const item = allItems.find((i) => i.id === itemId);
      if (item && item.validities?.length)
        itemsCost += item.validities[item.validities.length - 1].cost;
    });

    const totalCommissions =
      price *
      (((product.salesRepCommission || 0) +
        (product.toCommission || 0) +
        (product.creditCardCommission || 0)) /
        100);
    const totalCost = itemsCost + totalCommissions;

    return { price, totalCost, netProfit: price - totalCost };
  }

  private convertMurToSelectedCurrency(
    murAmount: number,
    targetCurrencyName: string,
    allCurrencies: any[],
  ): number {
    if (!targetCurrencyName || targetCurrencyName === CurrencyName.MUR) return murAmount;
    const currencyObj = allCurrencies.find((c) => c.name === targetCurrencyName);
    if (currencyObj && currencyObj.exchangeRate)
      return Number((murAmount / currencyObj.exchangeRate).toFixed(2));
    return murAmount;
  }
}
