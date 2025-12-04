import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { VehicleCategory } from '../../../models/vehicle-category.model';
import { VehicleCategoryService } from '../../../services/vehicle-category.service';
import { NotificationService } from '../../../services/notification.service';
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vehicle-category-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ListPageComponent, DataTableComponent, MatIconModule],
  templateUrl: './vehicle-category-list.html',
})
export class VehicleCategoryListComponent {
  private service = inject(VehicleCategoryService);
  private notificationService = inject(NotificationService);

  vehicleCategories$: Observable<VehicleCategory[]> = this.service.getAll();

  displayedColumns = ['name', 'capacity', 'actions'];

  columnDefs: ColumnDefinition<VehicleCategory>[] = [
    { columnDef: 'name', header: 'Name', cell: (row) => row.name, isSortable: true },
    { columnDef: 'capacity', header: 'Capacity', cell: (row) => row.capacity, isSortable: true },
  ];

  editRoute = (row: VehicleCategory) => ['/vehicle-categories', 'edit', row.id];

  async onDelete(item: VehicleCategory) {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await this.service.delete(item.id);
        this.notificationService.showSuccess('Vehicle Category deleted successfully.');
      } catch (error) {
        this.notificationService.showError('Failed to delete item.');
      }
    }
  }
}
