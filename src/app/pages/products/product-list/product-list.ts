import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../models/product.model';
import { ItemCategory, UnitType } from '../../../models/item.model';
import { ProductService } from '../../../services/product.service';
import { NotificationService } from '../../../services/notification.service';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import {
  DataTableComponent,
  DropdownFilter,
} from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ListPageComponent, DataTableComponent],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.scss'],
})
export class ProductListComponent {
  private productService = inject(ProductService);
  private notificationService = inject(NotificationService);

  products$: Observable<Product[]> = this.productService.getProducts();

  displayedColumns = [
    'name',
    'productCategory',
    'vehicleCategoryName',
    'unitType',
    'partnerName',
    'actions',
  ];

  columnDefs: ColumnDefinition<Product>[] = [
    { columnDef: 'name', header: 'Name', cell: (p) => p.name, isSortable: true },
    {
      columnDef: 'productCategory',
      header: 'Category',
      cell: (p) => p.productCategory,
      isSortable: true,
    },
    {
      columnDef: 'vehicleCategoryName',
      header: 'Vehicle',
      cell: (p) => p.vehicleCategoryName || '-',
      isSortable: true,
    },
    { columnDef: 'unitType', header: 'Unit', cell: (p) => p.unitType, isSortable: true },
    { columnDef: 'partnerName', header: 'Partner', cell: (p) => p.partnerName, isSortable: true },
  ];

  dropdownFilters: DropdownFilter<Product>[] = [
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

  viewRoute = (p: Product) => ['/products', p.id];
  editRoute = (p: Product) => ['/products', 'edit', p.id];

  async onDelete(product: Product) {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        if (product.id) {
          await this.productService.deleteProduct(product.id);
          this.notificationService.showSuccess('Product deleted successfully.');
        }
      } catch (error) {
        this.notificationService.showError('Failed to delete product.');
      }
    }
  }
}
