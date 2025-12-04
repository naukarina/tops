import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Item, ItemCategory, UnitType } from '../../../models/item.model';
import { ItemService } from '../../../services/item.service';
import { NotificationService } from '../../../services/notification.service';
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import {
  DataTableComponent,
  DropdownFilter,
} from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ListPageComponent, DataTableComponent, MatIconModule],
  templateUrl: './item-list.html',
})
export class ItemListComponent {
  private itemService = inject(ItemService);
  private notificationService = inject(NotificationService);

  items$: Observable<Item[]> = this.itemService.getAll();

  displayedColumns = [
    'name',
    'itemCategory',
    'virtual',
    'vehicleCategoryName',
    'unitType',
    'partnerName',
    'actions',
  ];

  columnDefs: ColumnDefinition<Item>[] = [
    { columnDef: 'name', header: 'Name', cell: (i) => i.name, isSortable: true },
    {
      columnDef: 'itemCategory',
      header: 'Category',
      cell: (i) => i.itemCategory,
      isSortable: true,
    },
    // Add this definition
    {
      columnDef: 'virtual',
      header: 'Virtual',
      cell: (i) => (i.virtual ? 'Yes' : 'No'),
      isSortable: true,
    },
    {
      columnDef: 'vehicleCategoryName',
      header: 'Vehicle Category',
      cell: (i) => i.vehicleCategoryName || '-',
      isSortable: true,
    },
    { columnDef: 'unitType', header: 'Unit', cell: (i) => i.unitType, isSortable: true },
    { columnDef: 'partnerName', header: 'Partner', cell: (i) => i.partnerName, isSortable: true },
  ];
  dropdownFilters: DropdownFilter<Item>[] = [
    {
      columnDef: 'itemCategory',
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

  viewRoute = (item: Item) => ['/items', item.id];
  editRoute = (item: Item) => ['/items', 'edit', item.id];

  async onDelete(item: Item) {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await this.itemService.delete(item.id);
        this.notificationService.showSuccess('Item deleted successfully.');
      } catch (error) {
        this.notificationService.showError('Failed to delete item.');
      }
    }
  }
}
