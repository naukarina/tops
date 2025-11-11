import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Guest } from '../../../models/guest.model';
import { GuestService } from '../../../services/guest.service';
import { NotificationService } from '../../../services/notification.service';

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import {
  DataTableComponent,
  DropdownFilter,
} from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';

// Material Imports
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-guest-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ListPageComponent, DataTableComponent, MatIconModule],
  templateUrl: './guest-list.html',
  styleUrls: ['./guest-list.scss'],
  providers: [DatePipe],
})
export class GuestListComponent {
  private guestService = inject(GuestService);
  private notificationService = inject(NotificationService);

  guests$: Observable<Guest[]> = this.guestService.getAll();

  private datePipe = inject(DatePipe);

  // --- DERIVE OPTIONS FROM GUESTS$ ---
  availableTourOperators$: Observable<string[]> = this.guests$.pipe(
    map((guests) => {
      const operators = guests
        .map((g) => g.tourOperatorName)
        .filter((op): op is string => !!op && op.trim() !== '');
      const uniqueOperators = [...new Set(operators)];
      return uniqueOperators.sort((a, b) => a.localeCompare(b));
    })
  );

  // Define which columns to show in the table
  displayedColumns = [
    'name',
    'tourOperatorName',
    'arrivalDate',
    'departureDate',
    'pax.total',
    'actions',
  ];

  // Define all columns for filtering and potential export
  columnsForTable = [
    'name',
    'tourOperatorName',
    'arrivalDate',
    'departureDate',
    'pax.total',
    'email',
    'tel',
  ];

  // Column definitions for the data-table
  columnDefs: ColumnDefinition<Guest>[] = [
    { columnDef: 'name', header: 'Name', cell: (g) => g.name, isSortable: true },
    {
      columnDef: 'tourOperatorName',
      header: 'Tour Operator',
      cell: (g) => g.tourOperatorName,
      isSortable: true,
    },
    {
      columnDef: 'arrivalDate',
      header: 'Arrival',
      cell: (g) => (g.arrivalDate ? this.datePipe.transform(g.arrivalDate.toDate()) : ''),
      isSortable: true,
    },
    {
      columnDef: 'departureDate',
      header: 'Departure',
      cell: (g) => (g.departureDate ? this.datePipe.transform(g.departureDate.toDate()) : ''),
      isSortable: true,
    },
    {
      columnDef: 'pax.total',
      header: 'Pax',
      cell: (g) => g.pax?.total ?? (g.pax?.adult || 0) + (g.pax?.child || 0) + (g.pax?.infant || 0),
      isSortable: true,
    },
    { columnDef: 'email', header: 'Email', cell: (g) => g.email || '', isSortable: true },
    { columnDef: 'tel', header: 'Telephone', cell: (g) => g.tel || '', isSortable: true },
  ];

  // Dropdown filters
  guestDropdownFilters: DropdownFilter<Guest>[] = [
    {
      columnDef: 'tourOperatorName',
      placeholder: 'Filter by Tour Operator',
      options: this.availableTourOperators$, // Use the derived observable
      multiple: true,
      searchable: true,
    },
  ];

  guestViewRoute = (guest: Guest) => ['/guests', guest.id];
  guestEditRoute = (guest: Guest) => ['/guests', 'edit', guest.id];

  async onDeleteGuest(guest: Guest) {
    if (confirm(`Are you sure you want to delete guest "${guest.name}"?`)) {
      try {
        await this.guestService.delete(guest.id);
        this.notificationService.showSuccess('Guest deleted successfully.');
      } catch (error) {
        console.error('Error deleting guest:', error);
        this.notificationService.showError('Failed to delete guest.');
      }
    }
  }
}
