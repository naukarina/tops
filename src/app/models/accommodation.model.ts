import { BaseDocument } from './base-document.model';
import { Timestamp } from '@angular/fire/firestore';

// --- API Interfaces ---

export interface PaxApi {
  id: number;
  age: number;
}

export interface RoomCandidateApi {
  id: number;
  paxes: PaxApi[];
}

export interface AvailDestinationApi {
  type: string; // e.g., "HOT"
  code: number;
}

export interface ValuationRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  availDestinations: AvailDestinationApi[];
  roomCandidates: RoomCandidateApi[];
}

// --- Response Interfaces ---

export interface PricePerDay {
  date: string;
  price: number;
  formula: string;
}

export interface MealRate {
  id: number;
  date: string;
  pricePerDay: number;
  adultPrice: number;
  teenPrice: number;
  childPrice: number;
  infantPrice: number;
}

export interface MealPlan {
  id: number;
  name: string;
  type: string;
  price: number;
  mealRates?: MealRate[]; // Optional depending on if detailed rates are needed
}

export interface Promotion {
  id: number;
  name: string;
  type: string;
  discount: number;
  description: string;
}

export interface PriceWithPromotion {
  roomPricesPerDays: PricePerDay[];
  mealPlansWithPricesPerDays: {
    id: number;
    name: string;
    type: string;
    price: number;
    mealPlanPricesPerDays: MealRate[];
  }[];
  promotion: Promotion;
}

export interface AvailableRoom {
  roomId: number;
  roomCandidateId: number;
  comboId: number;
  combo: string;
  regularRoomPricesPerDays: PricePerDay[];
  mealPlans: MealPlan[];
  promotions: Promotion[];
  pricesPerDaysWithPromotion: PriceWithPromotion[];
}

export interface HotelOffer {
  hotelMarketId: number;
  name: string;
  availableRooms: AvailableRoom[];
}

// --- Firestore Document Interface ---

export interface Accommodation extends BaseDocument {
  guestName: string;
  hotelName: string;
  hotelMarketId: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'QUOTATION' | 'CONFIRMED' | 'CANCELLED';
  totalPrice: number;
  currency: string;

  // Store the request parameters to reload the form
  valuationRequest: ValuationRequest;

  // Store the result from the API
  valuationResult: HotelOffer[]; // Root response is an array
}
