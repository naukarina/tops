import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

import { AppFeature } from '../../../core/models/app-feature.model';
import { AppFeatureService } from '../../../core/services/app-feature.service';
import { NotificationService } from '../../../core/services/notification.service';

import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';

@Component({
  selector: 'app-app-feature-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ListPageComponent, DataTableComponent],
  templateUrl: './app-feature-list.html',
})
export class AppFeatureListComponent implements OnInit {
  private featureService = inject(AppFeatureService);
  private notificationService = inject(NotificationService);

  features$!: Observable<AppFeature[]>;

  columnsForTable = ['label', 'key', 'order', 'isActive'];

  columnDefs: ColumnDefinition<AppFeature>[] = [
    { columnDef: 'label', header: 'Feature Name', cell: (f) => f.label, isSortable: true },
    { columnDef: 'key', header: 'Key (Permission)', cell: (f) => f.key, isSortable: true },
    {
      columnDef: 'order',
      header: 'Order',
      cell: (f) => f.order?.toString() || '0',
      isSortable: true,
    },
    {
      columnDef: 'isActive',
      header: 'Status',
      cell: (f) => (f.isActive ? 'Active' : 'Inactive'),
      isSortable: true,
    },
  ];

  editRoute = (feature: AppFeature) => ['/app-features/edit', feature.id];

  ngOnInit() {
    this.features$ = this.featureService.getAll();
  }

  async deleteFeature(feature: AppFeature) {
    if (
      confirm(
        `Are you sure you want to delete the feature "${feature.label}"? This may break UI permission dependencies.`,
      )
    ) {
      try {
        await this.featureService.delete(feature.id);
        this.notificationService.showSuccess('Feature deleted successfully.');
      } catch (error) {
        console.error('Error deleting feature:', error);
        this.notificationService.showError('Failed to delete feature.');
      }
    }
  }
}
