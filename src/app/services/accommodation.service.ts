import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseService } from './base.service';
import { Accommodation, ValuationRequest, ValuationResponse } from '../models/accommodation.model';
import { firstValueFrom } from 'rxjs';
// Import Cloud Functions
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class AccommodationService extends BaseService<Accommodation> {
  private http = inject(HttpClient);
  private functions = inject(Functions); // Inject Functions
  private apiUrl = 'https://api.kreola-dev.com';

  private apiCreds = {
    email: 'admin@kreola-dev.com',
    password: 'secret',
  };

  private accessToken: string | null = null;

  constructor() {
    super('accommodations');
  }

  private async getAuthToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    try {
      // Login is a standard POST, so we can do this directly from the browser
      const res = await firstValueFrom(
        this.http.post<{ access_token: string }>(`${this.apiUrl}/auth/sign-in`, this.apiCreds)
      );
      this.accessToken = res.access_token;
      return res.access_token;
    } catch (error) {
      console.error('External API Auth Failed', error);
      throw new Error('Could not authenticate with pricing engine.');
    }
  }

  async getRoomPrices(hotelId: number, request: ValuationRequest): Promise<ValuationResponse[]> {
    const token = await this.getAuthToken();

    // Call the Cloud Function Proxy
    const getPricesFn = httpsCallable(this.functions, 'getRoomPricesProxy');

    try {
      const result = await getPricesFn({
        token: token,
        hotelId: hotelId,
        payload: request,
      });

      return result.data as ValuationResponse[];
    } catch (error) {
      console.error('Valuation Proxy Failed', error);
      throw error;
    }
  }
}
