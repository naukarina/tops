// src/app/pages/migration/strategies/hotel-import.strategy.ts
import { Injectable, inject } from '@angular/core';
import { IImportStrategy, CsvRow } from '../import-strategy.interface';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { CurrencyName } from '../../../models/currency.model';

@Injectable({ providedIn: 'root' })
export class HotelImportStrategy implements IImportStrategy<Partner> {
  name = 'Hotel Partners (from hotel.csv)';
  service = inject(PartnerService);

  mapRow(row: CsvRow): Partial<Partner> | null {
    // Use bracket notation to access properties
    const name = row['name']?.trim();
    if (!name || name === '') {
      return null; // Skip rows without a name
    }

    const starRating = parseInt(row['stars'], 10);

    const newPartner: Partial<Partner> = {
      name: name,
      type: PartnerType.HOTEL,
      contactInfo: {
        email: row['email']?.trim() || '',
        tel: row['tel']?.trim() || '',
        tel2: row['fax']?.trim() || '',
        address: row['address']?.trim().replace(/"/g, '') || '',
        zip: '',
        town: row['city']?.trim() || '',
        country: '',
      },
      currencyName: CurrencyName.MUR, // Set a required default
      remarks: row['remarks']?.trim(),
      hotelInfo: {
        starRating: isNaN(starRating) ? 0 : starRating,
        region: row['region']?.trim() as any,
      },
      isActive: true,
    };

    return newPartner;
  }
}
