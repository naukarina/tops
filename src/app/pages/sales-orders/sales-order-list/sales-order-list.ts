import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  SalesOrder,
  SalesOrderStatus,
  SalesOrderCategory,
} from '../../../models/sales-order.model';
import { SalesOrderService } from '../../../services/sales-order.service';
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
  selector: 'app-sales-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ListPageComponent, DataTableComponent, MatIconModule],
  templateUrl: './sales-order-list.html',
  styleUrls: ['./sales-order-list.scss'],
  providers: [DatePipe],
})
export class SalesOrderListComponent {
  private salesOrderService = inject(SalesOrderService);
  private notificationService = inject(NotificationService);
  private datePipe = inject(DatePipe);

  salesOrders$: Observable<SalesOrder[]> = this.salesOrderService.getAll();

  // Define which columns to show in the table
  displayedColumns = [
    'orderNumber',
    'status',
    'category',
    'partnerName',
    'guestName',
    'guestArrivalDate',
    'totalPrice',
    'actions',
  ];

  // Define all columns for filtering and potential export
  columnsForTable = [
    'orderNumber',
    'status',
    'category',
    'partnerName',
    'guestName',
    'guestArrivalDate',
    'totalPrice',
    'tourOperatorName',
    'fileRef',
  ];

  // Column definitions for the data-table
  columnDefs: ColumnDefinition<SalesOrder>[] = [
    {
      columnDef: 'orderNumber',
      header: 'Order #',
      // --- MODIFIED: Changed padStart(8, '0') to padStart(7, '0') ---
      cell: (so) =>
        so.orderNumber <= 0 ? 'Generating...' : String(so.orderNumber).padStart(7, '0'),
      // --- END MOD ---
      isSortable: true,
    },
    {
      columnDef: 'status',
      header: 'Status',
      cell: (so) => so.status,
      isSortable: true,
    },
    {
      columnDef: 'category',
      header: 'Category',
      cell: (so) => so.category,
      isSortable: true,
    },
    {
      columnDef: 'partnerName',
      header: 'Partner',
      cell: (so) => so.partnerName,
      isSortable: true,
    },
    {
      columnDef: 'guestName',
      header: 'Guest',
      cell: (so) => so.guestName || '',
      isSortable: true,
    },
    {
      columnDef: 'guestArrivalDate',
      header: 'Arrival',
      cell: (so) =>
        so.guestArrivalDate ? this.datePipe.transform(so.guestArrivalDate.toDate()) : '',
      isSortable: true,
    },
    {
      columnDef: 'totalPrice',
      header: 'Total',
      cell: (so) => so.totalPrice, // You can add currency pipe here
      isSortable: true,
    },
    {
      columnDef: 'tourOperatorName',
      header: 'Tour Operator',
      cell: (so) => so.tourOperatorName || '',
      isSortable: true,
    },
    {
      columnDef: 'fileRef',
      header: 'File Ref',
      cell: (so) => so.fileRef || '',
      isSortable: true,
    },
  ];

  // Dropdown filters
  salesOrderDropdownFilters: DropdownFilter<SalesOrder>[] = [
    {
      columnDef: 'status',
      placeholder: 'Filter by Status',
      options: Object.values(SalesOrderStatus),
      multiple: true,
      searchable: false,
    },
    {
      columnDef: 'category',
      placeholder: 'Filter by Category',
      options: Object.values(SalesOrderCategory),
      multiple: true,
      searchable: false,
    },
  ];

  salesOrderEditRoute = (so: SalesOrder) => ['/sales-orders', 'edit', so.id];

  async onDeleteSalesOrder(so: SalesOrder) {
    if (
      confirm(
        `Are you sure you want to delete Sales Order #${String(so.orderNumber).padStart(7, '0')}`
      )
    ) {
      try {
        await this.salesOrderService.delete(so.id);
        this.notificationService.showSuccess('Sales Order deleted successfully.');
      } catch (error) {
        console.error('Error deleting sales order:', error);
        this.notificationService.showError('Failed to delete sales order.');
      }
    }
  }
}
