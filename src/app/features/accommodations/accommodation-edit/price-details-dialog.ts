import { Component, Inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

export interface PriceBreakdownRow {
  date: string;
  originalRoomPrice: number;
  roomPrice: number;
  roomFormula?: string;
  mealPlanName?: string | null;
  mealPrice: number;
  total: number;
}

export interface PriceDetailsData {
  offerName: string;
  discountText?: string | null;
  isDiscounted: boolean;
  currency: string;
  rows: PriceBreakdownRow[];
  total: number;
}

@Component({
  selector: 'app-price-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatTableModule, DatePipe, DecimalPipe],
  template: `
    <h2 mat-dialog-title>Price Breakdown</h2>
    <mat-dialog-content>
      <div class="offer-header">
        <div class="offer-name"><strong>Offer:</strong> {{ data.offerName }}</div>
        @if (data.isDiscounted && data.discountText) {
        <span class="discount-badge">{{ data.discountText }}</span>
        }
      </div>

      <table mat-table [dataSource]="data.rows" class="w-100">
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let row">{{ row.date | date : 'dd.MM.yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="roomPrice">
          <th mat-header-cell *matHeaderCellDef class="text-end">Room Price</th>
          <td mat-cell *matCellDef="let row" class="text-end">
            @if (row.originalRoomPrice > row.roomPrice) {
            <div class="original-price">
              {{ data.currency }} {{ row.originalRoomPrice | number : '1.2-2' }}
            </div>
            }
            <div class="final-price">{{ data.currency }} {{ row.roomPrice | number : '1.2-2' }}</div>
            @if (row.roomFormula) {
            <div class="formula-text">{{ row.roomFormula }}</div>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="mealPlan">
          <th mat-header-cell *matHeaderCellDef class="text-center">Meal Plan(s)</th>
          <td mat-cell *matCellDef="let row" class="text-center">
            @if (row.mealPlanName) {
            <span class="meal-name">{{ row.mealPlanName }}:</span>
            <strong>{{ data.currency }} {{ row.mealPrice | number : '1.2-2' }}</strong>
            } @else {
            <span class="text-muted">—</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="total">
          <th mat-header-cell *matHeaderCellDef class="text-end">Daily Total</th>
          <td mat-cell *matCellDef="let row" class="text-end">
            <strong>{{ data.currency }} {{ row.total | number : '1.2-2' }}</strong>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      <div class="total-container">
        <strong>Total: {{ data.currency }} {{ data.total | number : '1.0-0' }}</strong>
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
      .text-center {
        text-align: center;
      }
      .text-muted {
        color: #999;
      }
      .offer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .offer-name {
        font-size: 1rem;
        color: #333;
      }
      .discount-badge {
        background: #2e7d32;
        color: #fff;
        font-weight: 600;
        font-size: 0.85rem;
        padding: 0.35rem 0.75rem;
        border-radius: 6px;
        white-space: nowrap;
      }
      .original-price {
        color: #999;
        text-decoration: line-through;
        font-size: 0.85em;
      }
      .final-price {
        font-weight: 700;
      }
      .formula-text {
        font-size: 0.75em;
        color: #888;
        font-family: monospace;
        margin-top: 2px;
      }
      .meal-name {
        color: #555;
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
  displayedColumns = ['date', 'roomPrice', 'mealPlan', 'total'];
  constructor(@Inject(MAT_DIALOG_DATA) public data: PriceDetailsData) {}
}
