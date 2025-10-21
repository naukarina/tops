// src/app/pages/partners/partner-list/partner-list.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Partner } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { RouterModule } from '@angular/router';

// Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';

@Component({
  selector: 'app-partner-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    ListPageComponent,
  ],
  templateUrl: './partner-list.html',
  styleUrls: ['./partner-list.scss'],
})
export class PartnerListComponent {
  private partnerService = inject(PartnerService);
  partners$: Observable<Partner[]> = this.partnerService.getAll();
  displayedColumns = ['name', 'type', 'currencyName', 'contactInfo.country', 'subDmc', 'actions'];
}
