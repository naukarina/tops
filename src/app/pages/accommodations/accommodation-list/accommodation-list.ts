import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Accommodation } from '../../../models/accommodation.model';
import { AccommodationService } from '../../../services/accommodation.service';
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-accommodation-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ListPageComponent, DataTableComponent],
  templateUrl: './accommodation-list.html',
  providers: [DatePipe],
})
export class AccommodationListComponent {
  private service = inject(AccommodationService);
  private notification = inject(NotificationService);
  private datePipe = inject(DatePipe);

  accommodations$: Observable<Accommodation[]> = this.service.getAll();

  displayedColumns = [
    'guestName',
    'hotelName',
    'startDate',
    'endDate',
    'totalPrice',
    'status',
    'actions',
  ];

  columnDefs: ColumnDefinition<Accommodation>[] = [
    { columnDef: 'guestName', header: 'Guest', cell: (row) => row.guestName, isSortable: true },
    { columnDef: 'hotelName', header: 'Hotel', cell: (row) => row.hotelName, isSortable: true },
    {
      columnDef: 'startDate',
      header: 'Check In',
      cell: (row) => (row.startDate ? this.datePipe.transform(row.startDate.toDate()) : ''),
      isSortable: true,
    },
    {
      columnDef: 'endDate',
      header: 'Check Out',
      cell: (row) => (row.endDate ? this.datePipe.transform(row.endDate.toDate()) : ''),
      isSortable: true,
    },
    { columnDef: 'totalPrice', header: 'Total', cell: (row) => row.totalPrice, isSortable: true },
    { columnDef: 'status', header: 'Status', cell: (row) => row.status, isSortable: true },
  ];

  editRoute = (row: Accommodation) => ['/accommodations', 'edit', row.id];

  async onDelete(item: Accommodation) {
    if (confirm(`Delete booking for ${item.guestName}?`)) {
      await this.service.delete(item.id);
      this.notification.showSuccess('Booking deleted.');
    }
  }
}
