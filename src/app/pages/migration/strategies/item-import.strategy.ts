// src/app/pages/migration/strategies/item-import.strategy.ts
import { Injectable, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs'; // Import firstValueFrom
import { IImportStrategy, CsvRow } from '../import-strategy.interface';
import { Item, ItemCategory, UnitType } from '../../../models/item.model';
import { ItemService } from '../../../services/item.service';

// Import services and models for lookup
import { PartnerService } from '../../../services/partner.service';
import { VehicleCategoryService } from '../../../services/vehicle-category.service';
import { Partner } from '../../../models/partner.model';
import { VehicleCategory } from '../../../models/vehicle-category.model';

@Injectable({ providedIn: 'root' })
export class ItemImportStrategy implements IImportStrategy<Item> {
  name = 'Items (from Items.csv)';
  service = inject(ItemService);

  // Inject dependency services
  private partnerService = inject(PartnerService);
  private vehicleCategoryService = inject(VehicleCategoryService);

  // Lookup Maps
  private partnerMap = new Map<string, string>(); // Name -> ID
  private vehicleCategoryMap = new Map<string, string>(); // Name -> ID

  /**
   * Pre-fetches all Partners and Vehicle Categories to build lookup maps.
   */
  async prepare(): Promise<void> {
    // Fetch both collections in parallel
    const [partners, categories] = await Promise.all([
      firstValueFrom(this.partnerService.getAll()),
      firstValueFrom(this.vehicleCategoryService.getAll()),
    ]);

    // Build Partner Map (Normalizing name to lower case for better matching)
    partners.forEach((p) => {
      if (p.name) this.partnerMap.set(p.name.trim().toLowerCase(), p.id);
    });

    // Build Vehicle Category Map
    categories.forEach((c) => {
      if (c.name) this.vehicleCategoryMap.set(c.name.trim().toLowerCase(), c.id);
    });
  }

  mapRow(row: CsvRow): Partial<Item> | null {
    const name = row['name']?.trim();
    if (!name) return null;

    // ... (Category and Unit parsing logic remains the same) ...
    let itemCategory: ItemCategory = ItemCategory.ELSE;
    const catStr = row['itemCategory']?.trim().toUpperCase();
    if (catStr && Object.values(ItemCategory).includes(catStr as ItemCategory)) {
      itemCategory = catStr as ItemCategory;
    }

    let unitType: UnitType = UnitType.UNIT;
    const unitStr = row['unitType']?.trim().toUpperCase();
    if (unitStr && Object.values(UnitType).includes(unitStr as UnitType)) {
      unitType = unitStr as UnitType;
    }

    const virtualStr = row['virtual']?.trim().toLowerCase();
    const isVirtual = virtualStr === 'yes' || virtualStr === 'true';

    const fromDate = this.parseDate(row['validityFrom']);
    const toDate = this.parseDate(row['validityTo']);
    const cost = parseFloat(row['cost']?.replace(/,/g, '') || '0');

    const validities = [];
    if (fromDate && toDate) {
      validities.push({
        from: Timestamp.fromDate(fromDate),
        to: Timestamp.fromDate(toDate),
        cost: isNaN(cost) ? 0 : cost,
      });
    }

    // --- LOOKUP LOGIC ---
    const partnerNameInput = row['partnerName']?.trim() || '';
    const vehicleCatInput = row['vehicleCategory']?.trim() || '';

    // Look up IDs using the maps (case-insensitive)
    const resolvedPartnerId = this.partnerMap.get(partnerNameInput.toLowerCase()) || null;
    const resolvedVehicleCatId = this.vehicleCategoryMap.get(vehicleCatInput.toLowerCase()) || null;

    if (!resolvedPartnerId && partnerNameInput) {
      console.warn(`Partner not found for item '${name}': ${partnerNameInput}`);
    }

    const newItem: Partial<Item> = {
      name: name,
      itemCategory: itemCategory,
      unitType: unitType,
      virtual: isVirtual,

      // Use resolved IDs
      partnerId: resolvedPartnerId || '',
      partnerName: partnerNameInput, // Keep the original name for reference

      vehicleCategoryId: resolvedVehicleCatId || '',
      vehicleCategoryName: vehicleCatInput, // Keep original name

      validities: validities,
    };

    return newItem;
  }

  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr || !dateStr.trim()) return null;
    try {
      const parts = dateStr.trim().split('/');
      if (parts.length === 3) {
        // Assuming DD/MM/YYYY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    } catch (e) {
      console.warn('Failed to parse date:', dateStr);
    }
    return null;
  }
}
