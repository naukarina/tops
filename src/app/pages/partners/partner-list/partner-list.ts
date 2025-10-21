// src/app/pages/partners/partner-list/partner-list.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';

import { Partner, PartnerType } from '../../../models/partner.model';
import { CurrencyName } from '../../../models/currency.model'; // Import CurrencyName
import { PartnerService } from '../../../services/partner.service';
import { NotificationService } from '../../../services/notification.service';

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
// Import DropdownFilter type along with DataTableComponent
import {
  DataTableComponent,
  DropdownFilter,
} from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';

// Material Imports
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-partner-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ListPageComponent, DataTableComponent, MatIconModule],
  templateUrl: './partner-list.html',
  styleUrls: ['./partner-list.scss'],
})
export class PartnerListComponent {
  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService);

  partners$: Observable<Partner[]> = this.partnerService.getAll();
  currencies = Object.values(CurrencyName); // Get currency enum values for the dropdown

  // Columns to display in the data-table
  displayedColumns = ['name', 'type', 'currencyName', 'contactInfo.country', 'subDmc', 'actions'];

  // Define how each column is rendered and configured
  columnDefs: ColumnDefinition<Partner>[] = [
    { columnDef: 'name', header: 'Name', cell: (p) => p.name, isSortable: true },
    { columnDef: 'type', header: 'Type', cell: (p) => p.type, isSortable: true },
    {
      columnDef: 'currencyName',
      header: 'Currency',
      cell: (p) => p.currencyName,
      isSortable: true,
    },
    {
      columnDef: 'contactInfo.country',
      header: 'Country',
      cell: (p) => p.contactInfo?.country || 'N/A',
      isSortable: true,
    },
    { columnDef: 'subDmc', header: 'Sub DMC', cell: (p) => p.subDmc || 'N/A', isSortable: true },
  ];

  // Define the dropdown filter configuration
  partnerDropdownFilters: DropdownFilter<Partner>[] = [
    {
      columnDef: 'currencyName', // The property in the Partner object to filter by
      placeholder: 'Filter by Currency', // Dropdown label
      options: this.currencies, // Provide the list of currencies
      multiple: true, // Allow selecting multiple currencies
      searchable: true, // Enable the search input
      // optionValue: 'valueProperty', // Use if options were objects like { valueProperty: 'MUR', textProperty: 'Mauritian Rupee' }
      // optionText: 'textProperty',  // Use if options were objects
    },
    // Add more dropdown filters here if needed (e.g., for 'type' or 'contactInfo.country')
    {
      columnDef: 'type',
      placeholder: 'Filter by Type',
      options: Object.values(PartnerType),
      multiple: true,
      searchable: false, // Example: Type filter is not searchable
    },
  ];

  // Define routes for actions (optional)
  partnerViewRoute = (partner: Partner) => ['/partners', partner.id];
  partnerEditRoute = (partner: Partner) => ['/partners', 'edit', partner.id];

  // Delete handler
  async onDeletePartner(partner: Partner) {
    if (confirm(`Are you sure you want to delete partner "${partner.name}"?`)) {
      try {
        await this.partnerService.delete(partner.id);
        this.notificationService.showSuccess('Partner deleted successfully.');
      } catch (error) {
        console.error('Error deleting partner:', error);
        this.notificationService.showError('Failed to delete partner.');
      }
    }
  }
}
