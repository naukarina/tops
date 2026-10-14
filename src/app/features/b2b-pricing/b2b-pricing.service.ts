import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export interface B2bHotel {
  externalHotelId: string;
  name: string;
}

// The merchant is resolved server-side from the signed-in partner account,
// so none of these calls take a merchant argument.
@Injectable({ providedIn: 'root' })
export class B2bPricingService {
  private functions = inject(Functions);

  async getHotels(): Promise<B2bHotel[]> {
    const fn = httpsCallable(this.functions, 'b2bGetHotelsProxy');
    const result = await fn({});
    return result.data as B2bHotel[];
  }

  async getPrices(payload: {
    externalHotelId: string;
    startDate: string;
    endDate: string;
    roomCandidates: any[];
  }): Promise<any[]> {
    const fn = httpsCallable(this.functions, 'b2bGetPricesProxy');
    const result = await fn(payload);
    return result.data as any[];
  }
}
