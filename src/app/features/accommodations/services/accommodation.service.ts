import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseService } from '../../../core/services/base.service';
import { Accommodation, ValuationRequest, HotelOffer } from '../models/accommodation.model';
import { firstValueFrom } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class AccommodationService extends BaseService<Accommodation> {
  private http = inject(HttpClient);
  private functions = inject(Functions);
  private apiUrl = 'https://api.kreola-dev.com';

  private apiCreds = {
    email: 'admin@kreola-dev.com',
    password: 'secret',
  };

  private accessToken: string | null = null;

  constructor() {
    super('accommodations');
  }

  // 1. Fetch the token from the Kreola API
  private async getAuthToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    try {
      const res = await firstValueFrom(
        this.http.post<{ access_token: string }>(`${this.apiUrl}/auth/sign-in`, this.apiCreds),
      );
      this.accessToken = res.access_token;
      return res.access_token;
    } catch (error) {
      console.error('External API Auth Failed', error);
      throw new Error('Could not authenticate with pricing engine.');
    }
  }

  // 2. Pass the token and the payload to the Firebase Proxy to bypass CORS/GET body limitations
  async getRoomPrices(merchantId: number, request: any): Promise<any[]> {
    const token = await this.getAuthToken();
    const getPricesFn = httpsCallable(this.functions, 'getRoomPricesProxy');

    try {
      const result = await getPricesFn({
        token: token,
        merchantId: merchantId, // Send the Merchant ID to the proxy
        payload: request,
      });

      return result.data as any[];
    } catch (error) {
      console.error('Valuation Proxy Failed', error);
      throw error;
    }
  }
}
