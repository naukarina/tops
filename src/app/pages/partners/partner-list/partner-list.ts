// src/app/pages/partners/partner-list/partner-list.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// --- Import map operator ---
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
// ---
import { RouterModule } from '@angular/router';

import { Partner, PartnerType } from '../../../models/partner.model';
import { CurrencyName } from '../../../models/currency.model';
import { PartnerService } from '../../../services/partner.service';
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
  currencies = Object.values(CurrencyName);

  // --- DERIVE OPTIONS FROM PARTNERS$ ---
  availableCountries$: Observable<string[]> = this.partners$.pipe(
    map((partners) => {
      // 1. Get all countries, filter out null/undefined/empty strings
      const countries = partners
        .map((p) => p.contactInfo?.country)
        .filter((c): c is string => !!c && c.trim() !== '');
      // 2. Get unique values
      const uniqueCountries = [...new Set(countries)];
      // 3. Sort alphabetically
      return uniqueCountries.sort((a, b) => a.localeCompare(b));
    })
  );

  availableSubDmcs$: Observable<string[]> = this.partners$.pipe(
    map((partners) => {
      // 1. Get all subDmcs, filter out null/undefined/empty strings
      const subDmcs = partners
        .map((p) => p.subDmc)
        .filter((sd): sd is string => !!sd && sd.trim() !== '');
      // 2. Get unique values
      const uniqueSubDmcs = [...new Set(subDmcs)];
      // 3. Sort alphabetically
      return uniqueSubDmcs.sort((a, b) => a.localeCompare(b));
    })
  );
  // --- END DERIVE OPTIONS ---

  displayedColumns = ['name', 'type', 'currencyName', 'contactInfo.country', 'subDmc', 'actions'];

  columnsForTable = [
    'name',
    'type',
    'currencyName',
    'contactInfo.country',
    'subDmc',
    'contactInfo.address',
  ];

  // Column definitions remain the same
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
      cell: (p) => p.contactInfo?.country || '',
      isSortable: true,
    },
    { columnDef: 'subDmc', header: 'Sub DMC', cell: (p) => p.subDmc || '', isSortable: true },
    {
      columnDef: 'contactInfo.address',
      header: 'Address',
      cell: (p) => p.contactInfo?.address || '',
      isSortable: true,
    },
  ];

  // --- UPDATE Dropdown Filters to use Observables ---
  partnerDropdownFilters: DropdownFilter<Partner>[] = [
    {
      columnDef: 'currencyName',
      placeholder: 'Filter by Currency',
      options: this.currencies, // Currencies are static, keep as array
      multiple: true,
      searchable: true,
    },
    {
      columnDef: 'type',
      placeholder: 'Filter by Type',
      options: Object.values(PartnerType), // Types are static, keep as array
      multiple: true,
      searchable: false,
    },
    {
      // New Country Filter
      columnDef: 'contactInfo.country',
      placeholder: 'Filter by Country',
      options: this.availableCountries$, // Use the derived observable
      multiple: true,
      searchable: true,
    },
    {
      // New Sub-DMC Filter
      columnDef: 'subDmc',
      placeholder: 'Filter by Sub-DMC',
      options: this.availableSubDmcs$, // Use the derived observable
      multiple: true,
      searchable: true,
    },
  ];
  // --- END UPDATE ---

  partnerViewRoute = (partner: Partner) => ['/partners', partner.id];
  partnerEditRoute = (partner: Partner) => ['/partners', 'edit', partner.id];

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
