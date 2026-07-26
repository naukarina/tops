import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseService } from '../../../core/services/base.service';
import { Accommodation } from '../models/accommodation.model';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AVAILABILITY_MOCK } from './availability-mock.data';
import { environment } from '../../../../environments/environment';

const KREOLA_URL = environment.apiUrl;
const KREOLA_CREDS = environment.apiCredentials;

@Injectable({
  providedIn: 'root',
})
export class AccommodationService extends BaseService<Accommodation> {
  private functions = inject(Functions);
  private http = inject(HttpClient);
  private accessToken: string | null = null;

  constructor() {
    super('accommodations');
  }

  private async getKreolaToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    const { access_token } = await firstValueFrom(
      this.http.post<{ access_token: string }>(`${KREOLA_URL}/auth/sign-in`, KREOLA_CREDS),
    );
    this.accessToken = access_token;
    return access_token;
  }

  async getAvailabilityMock(): Promise<any[]> {
    return Promise.resolve(AVAILABILITY_MOCK);
  }

  // 401 on a cached token means it expired — sign in again once and retry
  private async authedRequest<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await this.getKreolaToken();
    try {
      return await fn(token);
    } catch (error: any) {
      if (error?.status === 401) {
        this.accessToken = null;
        return fn(await this.getKreolaToken());
      }
      throw error;
    }
  }

  async getAvailability(payload: {
    externalMerchantId: string;
    externalHotelId: string;
    startDate: string;
    endDate: string;
    roomCandidates: any[];
  }): Promise<any[]> {
    return this.authedRequest((token) =>
      firstValueFrom(
        this.http.post<any[]>(`${KREOLA_URL}/erp/availability`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    );
  }

  // Hotels with the externalHotelId that /erp/availability accepts.
  // Note: the codes from /erp/hotel-list are supplier catalog codes and are NOT valid there.
  async getMerchantHotels(merchantId: number): Promise<any[]> {
    return this.authedRequest((token) =>
      firstValueFrom(
        this.http.get<any[]>(`${KREOLA_URL}/erp/merchants/${merchantId}/hotels`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    );
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
