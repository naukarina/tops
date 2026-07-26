import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface PromotionInfoData {
  title: string;
  description: string | null;
}

@Component({
  selector: 'app-promotion-info-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.description) {
      <div class="promo-description" [innerHTML]="data.description"></div>
      } @else {
      <p class="text-muted">No description available for this promotion.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .promo-description {
        font-size: 0.95rem;
        line-height: 1.5;
        color: #333;
      }
      .text-muted {
        color: #999;
      }
    `,
  ],
})
export class PromotionInfoDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: PromotionInfoData) {}
}
