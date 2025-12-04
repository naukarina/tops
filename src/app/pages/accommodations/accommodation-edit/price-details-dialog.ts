import { Component, Inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

export interface PriceDetailRow {
  date: string;
  description: string;
  price: number;
  formula?: string;
}

export interface PriceDetailsData {
  title: string;
  rows: PriceDetailRow[];
  total: number;
}

@Component({
  selector: 'app-price-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatTableModule, DatePipe, DecimalPipe],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <table mat-table [dataSource]="data.rows" class="w-100">
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let row">{{ row.date | date : 'dd MMM yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef>Description</th>
          <td mat-cell *matCellDef="let row">
            {{ row.description }}
            @if (row.formula) {
            <div class="formula-text">{{ row.formula }}</div>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef class="text-end">Price</th>
          <td mat-cell *matCellDef="let row" class="text-end">
            {{ row.price | number : '1.2-2' }}
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      <div class="total-container">
        <strong>Total: {{ data.total | number : '1.2-2' }}</strong>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .w-100 {
        width: 100%;
      }
      .text-end {
        text-align: right;
      }
      .formula-text {
        font-size: 0.8em;
        color: #666;
        font-family: monospace;
      }
      .total-container {
        margin-top: 16px;
        text-align: right;
        font-size: 1.1em;
        padding: 16px;
        border-top: 1px solid #e0e0e0;
      }
    `,
  ],
})
export class PriceDetailsDialogComponent {
  displayedColumns = ['date', 'description', 'price'];
  constructor(@Inject(MAT_DIALOG_DATA) public data: PriceDetailsData) {}
}
