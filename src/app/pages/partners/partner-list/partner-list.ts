// src/app/pages/partners/partner-list/partner-list.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';

import { Partner, PartnerType } from '../../../models/partner.model'; // Import PartnerType
import { PartnerService } from '../../../services/partner.service';
import { NotificationService } from '../../../services/notification.service'; // For delete feedback

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import { DataTableComponent } from '../../../shared/components/data-table/data-table'; // <-- Import Data Table
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model'; // <-- Import Column Definition

// Material Imports needed *only* if you use features outside the data table itself
// (e.g., status badge styling is in partner-list.scss)
// Removed MatTableModule, MatCheckboxModule, MatSortModule, MatPaginatorModule etc.
import { MatIconModule } from '@angular/material/icon'; // Keep if used in ListPageComponent or directly

@Component({
  selector: 'app-partner-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ListPageComponent,
    DataTableComponent, // <-- Add Data Table Component
    MatIconModule, // Keep if needed elsewhere
  ],
  templateUrl: './partner-list.html',
  styleUrls: ['./partner-list.scss'], // Keep styles for status badges etc.
})
export class PartnerListComponent {
  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService); // Inject NotificationService

  partners$: Observable<Partner[]> = this.partnerService.getAll();

  // Columns to display in the data-table
  displayedColumns = ['name', 'type', 'currencyName', 'contactInfo.country', 'subDmc', 'actions'];

  // Define how each column is rendered and configured
  columnDefs: ColumnDefinition<Partner>[] = [
    {
      columnDef: 'name',
      header: 'Name',
      cell: (partner) => partner.name, // Display partner's name
      isSortable: true,
    },
    {
      columnDef: 'type',
      header: 'Type',
      cell: (partner) => partner.type, // Display partner's type
      isSortable: true,
    },
    {
      columnDef: 'currencyName',
      header: 'Currency',
      cell: (partner) => partner.currencyName, // Display currency
      isSortable: true,
    },
    {
      columnDef: 'contactInfo.country', // Use dot notation for nested properties if desired
      header: 'Country',
      cell: (partner) => partner.contactInfo?.country || 'N/A', // Safely access nested property
      isSortable: true,
    },
    {
      columnDef: 'subDmc',
      header: 'Sub DMC',
      cell: (partner) => partner.subDmc || 'N/A',
      isSortable: true,
    },
    // Action column is handled by specific inputs/outputs in data-table
  ];

  // Define routes for actions (optional)
  partnerViewRoute = (partner: Partner) => ['/partners', partner.id]; // Example View Route
  partnerEditRoute = (partner: Partner) => ['/partners', 'edit', partner.id]; // Example Edit Route

  // Delete handler
  async onDeletePartner(partner: Partner) {
    if (confirm(`Are you sure you want to delete partner "${partner.name}"?`)) {
      try {
        await this.partnerService.delete(partner.id);
        this.notificationService.showSuccess('Partner deleted successfully.');
        // Note: The list will update automatically due to the observable nature
      } catch (error) {
        console.error('Error deleting partner:', error);
        this.notificationService.showError('Failed to delete partner.');
      }
    }
  }
}
