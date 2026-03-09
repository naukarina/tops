import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../models/product.model';
import { ItemCategory, UnitType } from '../../items/models/item.model';
import { ProductService } from '../services/product.service';
import { ItemService } from '../../items/services/item.service'; // <-- Added
import { NotificationService } from '../../../core/services/notification.service';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators'; // <-- Added

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import {
  DataTableComponent,
  DropdownFilter,
} from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';
import { MatIconModule } from '@angular/material/icon';

// Extended interface to hold our calculated fields for the table
export interface ProductWithProfitability extends Product {
  calculatedPrice: number;
  calculatedTotalCost: number;
  calculatedNetProfit: number;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ListPageComponent, DataTableComponent],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.scss'],
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private itemService = inject(ItemService); // <-- Injected Item Service
  private notificationService = inject(NotificationService);

  // Combine Products and Items to calculate costs on the fly
  products$: Observable<ProductWithProfitability[]> = combineLatest([
    this.productService.getAll(),
    this.itemService.getAll(),
  ]).pipe(
    map(([products, items]) => {
      const now = new Date();

      return products.map((p) => {
        // 1. Calculate Current Price
        let currentPrice = 0;
        if (p.validities && p.validities.length > 0) {
          const valid = p.validities.find((v) => {
            const from = v.from instanceof Date ? v.from : (v.from as any).toDate();
            const to = v.to instanceof Date ? v.to : (v.to as any).toDate();
            return now >= from && now <= to;
          });
          // Fallback to latest validity if no current date match
          currentPrice = valid ? valid.price : p.validities[p.validities.length - 1].price;
        }

        // 2. Calculate Items Cost based on current validity
        let itemsCost = 0;
        if (p.itemIds && p.itemIds.length > 0) {
          p.itemIds.forEach((id) => {
            const item = items.find((i) => i.id === id);
            if (item && item.validities && item.validities.length > 0) {
              const validItem = item.validities.find((v: any) => {
                const from = v.from instanceof Date ? v.from : (v.from as any).toDate();
                const to = v.to instanceof Date ? v.to : (v.to as any).toDate();
                return now >= from && now <= to;
              });
              itemsCost += validItem
                ? validItem.cost
                : item.validities[item.validities.length - 1].cost;
            }
          });
        }

        // 3. Calculate Total Cost & Net Profit
        const commPerc =
          (p.salesRepCommission || 0) + (p.toCommission || 0) + (p.creditCardCommission || 0);
        const totalCommissions = currentPrice * (commPerc / 100);
        const totalCost = itemsCost + totalCommissions;
        const netProfit = currentPrice - totalCost;

        return {
          ...p,
          calculatedPrice: currentPrice,
          calculatedTotalCost: totalCost,
          calculatedNetProfit: netProfit,
        } as ProductWithProfitability;
      });
    }),
  );

  // Removed 'vehicleCategoryName', added Price, Total Cost, Net Profit
  displayedColumns = [
    'name',
    'productCategory',
    'unitType',
    'price',
    'totalCost',
    'netProfit',
    'actions',
  ];

  columnDefs: ColumnDefinition<ProductWithProfitability>[] = [
    { columnDef: 'name', header: 'Name', cell: (p) => p.name, isSortable: true },
    {
      columnDef: 'productCategory',
      header: 'Category',
      cell: (p) => p.productCategory,
      isSortable: true,
    },
    { columnDef: 'unitType', header: 'Unit', cell: (p) => p.unitType, isSortable: true },
    {
      columnDef: 'price',
      header: 'Price',
      cell: (p) => p.calculatedPrice.toFixed(2),
      isSortable: true,
    },
    {
      columnDef: 'totalCost',
      header: 'Total Cost',
      cell: (p) => p.calculatedTotalCost.toFixed(2),
      isSortable: true,
    },
    {
      columnDef: 'netProfit',
      header: 'Net Profit',
      // Adding a visual warning (⚠️) if the profit is in the minus
      cell: (p) =>
        p.calculatedNetProfit < 0
          ? `⚠️ ${p.calculatedNetProfit.toFixed(2)}`
          : p.calculatedNetProfit.toFixed(2),
      isSortable: true,
    },
  ];

  dropdownFilters: DropdownFilter<ProductWithProfitability>[] = [
    {
      columnDef: 'productCategory',
      placeholder: 'Filter by Category',
      options: Object.values(ItemCategory),
      multiple: true,
      searchable: false,
    },
    {
      columnDef: 'unitType',
      placeholder: 'Filter by Unit',
      options: Object.values(UnitType),
      multiple: true,
      searchable: false,
    },
  ];

  viewRoute = (p: ProductWithProfitability) => ['/products', p.id];
  editRoute = (p: ProductWithProfitability) => ['/products', 'edit', p.id];

  async onDelete(product: ProductWithProfitability) {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        if (product.id) {
          await this.productService.delete(product.id);
          this.notificationService.showSuccess('Product deleted successfully.');
        }
      } catch (error) {
        this.notificationService.showError('Failed to delete product.');
      }
    }
  }
}
