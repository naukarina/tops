import { Timestamp } from '@angular/fire/firestore';
import { BaseDocument } from '../../../core/models/base-document.model';
import { CurrencyName } from '../../../core/models/currency.model';
import { ItemCategory } from '../../items/models/item.model';

export enum ReservationType {
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
  INTER = 'INTER',
  SHUTTLE = 'SHUTTLE',
  EXCURSION = 'EXCURSION',
  ACCOMMODATION = 'ACCOMMODATION',
}

export interface ReservationPax {
  adult: number | null;
  child: number | null;
  infant: number | null;
  total: number | null;
}

export interface Reservation extends BaseDocument {
  salesOrderId: string;
  type: ReservationType;

  // Denormalized guest (from the Sales Order)
  guestId: string | null;
  guestName: string | null;
  tourOperatorId: string | null;

  date: Timestamp | null; // service date (accommodation uses startDate/endDate)
  flightNumber: string | null; // ARRIVAL/DEPARTURE only
  flightTime: string | null; // 'HH:mm'
  pickupTime: string | null; // 'HH:mm'
  fromLocation: string | null; // 'AIRPORT' default for ARRIVAL
  toLocation: string | null; // 'AIRPORT' default for DEPARTURE

  // Product + pricing (not used for ACCOMMODATION)
  productId: string | null;
  productName: string | null;
  qty: number; // default 1
  pax: ReservationPax | null;
  unitPrice: number; // auto from pricelist, overridable
  priceOverridden: boolean; // true once the user edits the price manually
  totalPrice: number; // unitPrice * qty
  currencyName: CurrencyName;

  // ACCOMMODATION only
  hotelName: string | null;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  accommodationId: string | null; // optional link to an existing accommodations doc (future)

  remarks: string | null;
}

/**
 * Maps a reservation type to the product categories whose products are
 * eligible for that type. ACCOMMODATION has no product and is omitted.
 */
export const RESERVATION_TYPE_CATEGORIES: Record<ReservationType, ItemCategory[]> = {
  [ReservationType.ARRIVAL]: [ItemCategory.AIRPORT_TRANSFER],
  [ReservationType.DEPARTURE]: [ItemCategory.AIRPORT_TRANSFER],
  [ReservationType.INTER]: [ItemCategory.INTER_HOTEL_TRANSFER],
  [ReservationType.SHUTTLE]: [ItemCategory.SHUTTLE],
  [ReservationType.EXCURSION]: [
    ItemCategory.EXCURSION,
    ItemCategory.EXCURSION_TRANSFER,
    ItemCategory.CAR_RENTAL,
  ],
  [ReservationType.ACCOMMODATION]: [],
};

export const RESERVATION_TYPE_LABELS: Record<ReservationType, string> = {
  [ReservationType.ARRIVAL]: 'Arrival',
  [ReservationType.DEPARTURE]: 'Departure',
  [ReservationType.INTER]: 'Inter-hotel',
  [ReservationType.SHUTTLE]: 'Shuttle',
  [ReservationType.EXCURSION]: 'Excursion',
  [ReservationType.ACCOMMODATION]: 'Accommodation',
};
