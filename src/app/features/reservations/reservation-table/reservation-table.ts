import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  RESERVATION_TYPE_LABELS,
  Reservation,
  ReservationType,
} from '../models/reservation.model';

@Component({
  selector: 'app-reservation-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './reservation-table.html',
  styleUrls: ['./reservation-table.scss'],
})
export class ReservationTableComponent {
  @Input({ required: true }) type!: ReservationType;
  @Input() reservations: Reservation[] = [];

  @Output() edit = new EventEmitter<Reservation>();
  @Output() remove = new EventEmitter<Reservation>();

  readonly displayedColumns = ['date', 'details', 'qty', 'price', 'actions'];
  readonly ReservationType = ReservationType;

  get label(): string {
    return RESERVATION_TYPE_LABELS[this.type];
  }

  get subtotal(): number {
    return this.reservations.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  }

  details(r: Reservation): string {
    if (this.type === ReservationType.ACCOMMODATION) {
      return r.hotelName || '—';
    }
    const route = [r.fromLocation, r.toLocation].filter(Boolean).join(' → ');
    return r.productName ? `${r.productName}${route ? ` (${route})` : ''}` : route || '—';
  }

  displayDate(r: Reservation): Date | null {
    if (this.type === ReservationType.ACCOMMODATION) {
      return r.startDate ? r.startDate.toDate() : null;
    }
    return r.date ? r.date.toDate() : null;
  }
}
