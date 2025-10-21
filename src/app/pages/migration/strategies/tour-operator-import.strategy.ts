// src/app/pages/migration/strategies/tour-operator-import.strategy.ts
import { Injectable, inject } from '@angular/core';
import { IImportStrategy, CsvRow } from '../import-strategy.interface';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { CurrencyName } from '../../../models/currency.model';

@Injectable({ providedIn: 'root' })
export class TourOperatorImportStrategy implements IImportStrategy<Partner> {
  name = 'Tour Operator Partners (from partners.csv)';
  service = inject(PartnerService);

  mapRow(row: CsvRow): Partial<Partner> | null {
    const name = row['name']?.trim();
    if (!name || name === '') {
      console.warn('Skipping row due to missing name:', row);
      return null; // Skip rows without a name
    }

    // --- Handle Currency (still required) ---
    let currencyName: CurrencyName | null = null;
    const currencyStr = row['currency']?.trim().toUpperCase();
    if (currencyStr && CurrencyName[currencyStr as keyof typeof CurrencyName]) {
      currencyName = CurrencyName[currencyStr as keyof typeof CurrencyName];
    } else {
      console.warn(
        `Invalid or missing currency '${row['currency']}' for partner '${name}', defaulting to MUR.`
      );
      currencyName = CurrencyName.MUR; // Default if invalid or missing
    }

    // --- Get all optional trimmed values ---
    const email = row['email']?.trim();
    const tel = row['tel']?.trim();
    const tel2 = row['tel2']?.trim();
    const fax = row['fax']?.trim(); // Will be used as fallback for tel2
    const address = row['address']?.trim().replace(/"/g, '');
    const town = row['city']?.trim() || row['town']?.trim();
    const country = row['country']?.trim();
    const zip = row['zip']?.trim();
    const brn = row['brn']?.trim();
    const isVatRegistered = row['isVat']?.trim().toLowerCase() === 'true'; // This is a boolean
    const vatNumber = row['vat']?.trim();
    const remarks = row['remarks']?.trim();
    const subDmc = row['subDmc']?.trim();

    // --- Construct the base Partner object ---
    // Initialize with only *required* or *default* values.
    const newPartner: Partial<Partner> = {
      name: name,
      type: PartnerType.TOUR_OPERATOR,
      currencyName: currencyName,
      isActive: true, // Default to active
      contactInfo: {}, // Initialize as empty objects
      taxinfo: {
        isVatRegistered: isVatRegistered, // This is always set (true/false)
      },
    };

    // --- Conditionally add properties to contactInfo ---
    // This logic ensures no empty strings ("") or undefined values are sent to Firestore
    if (email) newPartner.contactInfo!.email = email;
    if (tel) newPartner.contactInfo!.tel = tel;
    if (tel2) newPartner.contactInfo!.tel2 = tel2;
    else if (fax) newPartner.contactInfo!.tel2 = fax; // Fallback to fax only if tel2 is missing
    if (address) newPartner.contactInfo!.address = address;
    if (town) newPartner.contactInfo!.town = town;
    if (country) newPartner.contactInfo!.country = country;
    if (zip) newPartner.contactInfo!.zip = zip;

    // --- Conditionally add properties to taxinfo ---
    if (brn) newPartner.taxinfo!.brn = brn;

    // **THIS IS THE FIX:** Only add vatNumber if they are registered AND the number is not an empty string
    if (isVatRegistered && vatNumber) {
      newPartner.taxinfo!.vatNumber = vatNumber;
    }
    // If isVatRegistered is false, vatNumber is never added, solving the error.

    // --- Conditionally add root properties ---
    if (remarks) newPartner.remarks = remarks;
    if (subDmc) newPartner.subDmc = subDmc;

    // --- Basic Validation ---
    if (!newPartner.currencyName) {
      console.warn(`Skipping partner '${name}' due to invalid currency.`);
      return null; // Currency is required in the model
    }

    return newPartner;
  }
}
