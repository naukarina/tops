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

export interface RoomMappingApi {
  roomId: number;
  roomCandidateId: number;
}

export interface ValuationRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  hotelMarketId: number;
  promotionId: number;
  mealPlanCode: string;
  rooms: RoomMappingApi[];
  roomCandidates: RoomCandidateApi[];
}

export interface PriceBreakdown {
  date: string;
  roomPrices: {
    basePrice: number;
    discountedPrice: number;
  };
  mealPlanPrices: {
    basePrice: number;
    discountedPrice: number;
  };
}

export interface ValuationResponse {
  roomId: number;
  roomCandidateId: number;
  formula: string;
  combo: string;
  mealPlanId: number;
  mealRateIds: number[];
  promotionId: number;
  basePrice: number;
  discountedPrice: number;
  mealPlanPrice: number;
  discountedMealPlanPrice: number;
  totalPrice: number;
  totalDiscountedPrice: number;
  promotionApplied: string;
  priceBreakdown: PriceBreakdown[];
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
  valuationResult: ValuationResponse[];
}
