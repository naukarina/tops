import { Injectable, inject } from '@angular/core';
import { BaseService } from '../../../core/services/base.service';
import { Accommodation } from '../models/accommodation.model';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AVAILABILITY_MOCK } from './availability-mock.data';

@Injectable({
  providedIn: 'root',
})
export class AccommodationService extends BaseService<Accommodation> {
  private functions = inject(Functions);

  constructor() {
    super('accommodations');
  }

  async getAvailabilityMock(): Promise<any[]> {
    return Promise.resolve(AVAILABILITY_MOCK);
  }

  async getAvailability(payload: {
    externalMerchantId: string;
    externalHotelId: string;
    startDate: string;
    endDate: string;
    roomCandidates: any[];
  }): Promise<any[]> {
    return this.getRoomPrices(0, payload);
  }

  // Hotels with the externalHotelId that /erp/availability accepts.
  // Note: the codes from /erp/hotel-list are supplier catalog codes and are NOT valid there.
  async getMerchantHotels(merchantId: number): Promise<any[]> {
    const fn = httpsCallable(this.functions, 'getMerchantHotelsProxy');
    const result = await fn({ merchantId });
    return result.data as any[];
  }

  async getRoomPrices(merchantId: number, payload: any): Promise<any[]> {
    const getPricesFn = httpsCallable(this.functions, 'getRoomPricesProxy');
    try {
      const result = await getPricesFn({ merchantId, payload });
      return result.data as any[];
    } catch (error) {
      console.error('Valuation Proxy Failed', error);
      throw error;
    }
  }

  async getMerchants(): Promise<any[]> {
    const fn = httpsCallable(this.functions, 'getMerchantsProxy');
    try {
      const result = await fn({});
      return result.data as any[];
    } catch (error) {
      console.error('getMerchants Failed', error);
      throw error;
    }
  }

  async getMerchantHotelList(externalMerchantId: string): Promise<any> {
    const fn = httpsCallable(this.functions, 'getMerchantHotelListProxy');
    try {
      const result = await fn({ externalMerchantId });
      return result.data;
    } catch (error) {
      console.error('getMerchantHotelList Failed', error);
      throw error;
    }
  }
}
