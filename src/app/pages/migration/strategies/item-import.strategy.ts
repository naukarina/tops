import { Injectable, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { IImportStrategy, CsvRow } from '../import-strategy.interface';
import { Item, ItemCategory, UnitType } from '../../../models/item.model';
import { ItemService } from '../../../services/item.service';

@Injectable({ providedIn: 'root' })
export class ItemImportStrategy implements IImportStrategy<Item> {
  name = 'Items (from Items.csv)';
  service = inject(ItemService);

  mapRow(row: CsvRow): Partial<Item> | null {
    const name = row['name']?.trim();
    if (!name) {
      return null;
    }

    // --- Parse Item Category ---
    // Try to match the CSV string to the Enum. Default to ELSE if not found.
    let itemCategory: ItemCategory = ItemCategory.ELSE;
    const catStr = row['itemCategory']?.trim().toUpperCase();
    const matchedCatEntry = Object.entries(ItemCategory).find(
      ([k, v]) => v === catStr || k === catStr
    );
    if (matchedCatEntry) {
      itemCategory = matchedCatEntry[1];
    }

    // --- Parse Unit Type ---
    let unitType: UnitType = UnitType.UNIT; // Default
    const unitStr = row['unitType']?.trim().toUpperCase();
    const matchedUnitEntry = Object.entries(UnitType).find(
      ([k, v]) => v === unitStr || k === unitStr
    );
    if (matchedUnitEntry) {
      unitType = matchedUnitEntry[1];
    }

    // --- Parse Virtual ---
    const virtualStr = row['virtual']?.trim().toLowerCase();
    const isVirtual = virtualStr === 'yes' || virtualStr === 'true';

    // --- Parse Dates for Validity ---
    // Expected format: DD/MM/YYYY
    const fromDate = this.parseDate(row['validityFrom']);
    const toDate = this.parseDate(row['validityTo']);

    // Parse Cost
    const cost = parseFloat(row['cost']?.replace(/,/g, '') || '0');

    // Construct Validities Array
    const validities = [];
    if (fromDate && toDate) {
      validities.push({
        from: Timestamp.fromDate(fromDate),
        to: Timestamp.fromDate(toDate),
        cost: isNaN(cost) ? 0 : cost,
      });
    }

    const newItem: Partial<Item> = {
      name: name,
      itemCategory: itemCategory,
      unitType: unitType,
      virtual: isVirtual,
      // Mapping Code to ID (assuming legacy ID or manual fix later)
      partnerId: row['partnerCode']?.trim() || '',
      partnerName: row['partnerName']?.trim() || '',
      vehicleCategoryName: row['vehicleCategory']?.trim() || '',
      // vehicleCategoryId cannot be synchronously resolved here without a lookup map
      validities: validities,
    };

    return newItem;
  }

  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr || !dateStr.trim()) return null;
    try {
      // Assuming DD/MM/YYYY format based on CSV snippet
      const parts = dateStr.trim().split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-11
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    } catch (e) {
      console.warn('Failed to parse date:', dateStr);
    }
    return null;
  }
}
