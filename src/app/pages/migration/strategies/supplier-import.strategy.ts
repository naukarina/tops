// src/app/pages/migration/strategies/supplier-import.strategy.ts
import { Injectable, inject } from '@angular/core';
import { IImportStrategy, CsvRow } from '../import-strategy.interface';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { CurrencyName } from '../../../models/currency.model';

@Injectable({ providedIn: 'root' })
export class SupplierImportStrategy implements IImportStrategy<Partner> {
  name = 'Supplier Partners';
  service = inject(PartnerService);

  mapRow(row: CsvRow): Partial<Partner> | null {
    const name = row['name']?.trim();
    if (!name || name === '') {
      console.warn('Skipping row due to missing name:', row);
      return null;
    }

    // --- Handle Currency ---
    let currencyName: CurrencyName | null = null;
    const currencyStr = row['currency']?.trim().toUpperCase();
    if (currencyStr && CurrencyName[currencyStr as keyof typeof CurrencyName]) {
      currencyName = CurrencyName[currencyStr as keyof typeof CurrencyName];
    } else {
      // Default to MUR if missing or invalid
      currencyName = CurrencyName.MUR;
    }

    // --- Parse Boolean for VAT ---
    const isVatRegistered = row['isVat']?.trim().toLowerCase() === 'true';

    // --- Construct the Partner object ---
    const newPartner: Partial<Partner> = {
      name: name,
      type: PartnerType.SUPPLIER, // <--- Explicitly set to SUPPLIER
      currencyName: currencyName,
      isActive: true,
      contactInfo: {},
      taxinfo: {
        isVatRegistered: isVatRegistered,
      },
    };

    // --- Map Optional Fields ---
    const email = row['email']?.trim();
    const tel = row['tel']?.trim();
    const tel2 = row['tel2']?.trim();
    const fax = row['fax']?.trim();
    const address = row['address']?.trim().replace(/"/g, ''); // Remove quotes if present
    const town = row['city']?.trim() || row['town']?.trim();
    const country = row['country']?.trim();
    const zip = row['zip']?.trim();
    const brn = row['brn']?.trim();
    const vatNumber = row['vat']?.trim();
    const remarks = row['remarks']?.trim();

    // Populate Contact Info
    if (email) newPartner.contactInfo!.email = email;
    if (tel) newPartner.contactInfo!.tel = tel;
    // Use 'fax' column as fallback for 'tel2' if 'tel2' is empty
    if (tel2) newPartner.contactInfo!.tel2 = tel2;
    else if (fax) newPartner.contactInfo!.tel2 = fax;

    if (address) newPartner.contactInfo!.address = address;
    if (town) newPartner.contactInfo!.town = town;
    if (country) newPartner.contactInfo!.country = country;
    if (zip) newPartner.contactInfo!.zip = zip;

    // Populate Tax Info
    if (brn) newPartner.taxinfo!.brn = brn;
    if (isVatRegistered && vatNumber) {
      newPartner.taxinfo!.vatNumber = vatNumber;
    }

    if (remarks) newPartner.remarks = remarks;

    return newPartner;
  }
}
