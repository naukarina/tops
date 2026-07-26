import { Injectable } from '@angular/core';
import { collectionData, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { BaseService } from '../../../core/services/base.service';
import { Reservation } from '../models/reservation.model';

@Injectable({
  providedIn: 'root',
})
export class ReservationService extends BaseService<Reservation> {
  constructor() {
    super('reservations');
  }

  getBySalesOrder(salesOrderId: string): Observable<Reservation[]> {
    const q = query(this.collection, where('salesOrderId', '==', salesOrderId));
    return collectionData(q, { idField: 'id' }) as Observable<Reservation[]>;
  }
}
