import { Injectable, inject } from '@angular/core';
import { BaseService } from '../../../core/services/base.service';
import { Accommodation } from '../models/accommodation.model';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class AccommodationService extends BaseService<Accommodation> {
  private functions = inject(Functions);
  constructor() {
    super('accommodations');
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
}
