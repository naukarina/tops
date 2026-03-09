import { Injectable, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { CsvRow, IImportStrategy } from '../import-strategy.interface';
import { ProductService, Product } from '../../products';
import { ItemService, TransferType } from '../../items';
import { firstValueFrom, isObservable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductCsvImportStrategy implements IImportStrategy<Product> {
  name = 'Products (From Profitability CSV)';
  service = inject(ProductService);

  private itemService = inject(ItemService);
  private itemNameMap: Map<string, string> = new Map();

  // Aggressive normalization: Removes spaces, dashes, parentheses to prevent matching errors
  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
  }

  // 1. THE FIX: Renamed to prepare() to perfectly match your migration-page.ts
  async prepare(): Promise<void> {
    console.log('Fetching new items database for ID cross-referencing...');
    this.itemNameMap.clear();

    try {
      const result = this.itemService.getAll
        ? this.itemService.getAll()
        : (this.itemService as any).get();

      const allItems = isObservable(result) ? await firstValueFrom(result) : await result;

      allItems.forEach((item: any) => {
        if (item.name && item.id) {
          const normalizedName = this.normalizeString(item.name);
          this.itemNameMap.set(normalizedName, item.id);
        }
      });
      console.log(`✅ Loaded ${this.itemNameMap.size} items into memory for ID matching.`);
    } catch (error) {
      console.error('❌ Failed to load items.', error);
      throw error;
    }
  }

  // 2. Synchronous row mapping
  mapRow(row: CsvRow): Partial<Product> | null {
    const newItemIds: string[] = [];
    const formula = row['itemsCostFormula'] || '';

    // ALIAS MAP: If a name in Excel completely differs from DB, map the EXCEL name to the DB name here
    const aliasMap: { [key: string]: string } = {
      'Lunch - Tante Athalie - CHILD': 'Lunch Tante Athalie (Child)',
    };

    if (formula) {
      // Split by + handling variations in spacing
      const itemEntries = formula.split(/\s*\+\s*/);

      for (const entry of itemEntries) {
        // Strip pricing block (e.g. "(1800/2070)")
        let extractedName = entry.replace(/\s*\([^)]+\)\s*$/, '').trim();

        if (extractedName) {
          // Apply alias if needed
          if (aliasMap[extractedName]) {
            extractedName = aliasMap[extractedName];
          }

          const normalizedExtracted = this.normalizeString(extractedName);
          const mappedId = this.itemNameMap.get(normalizedExtracted);

          if (mappedId) {
            newItemIds.push(mappedId);
          } else {
            console.warn(
              `⚠️ WARNING: Could not find Item ID for "${extractedName}" (Normalized: ${normalizedExtracted}) in Product: "${row['name']}"`,
            );
          }
        }
      }
    }

    const parseDate = (dateString: string): Timestamp => {
      if (!dateString) return Timestamp.now();
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const date = new Date(
          parseInt(parts[2], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[0], 10),
        );
        return Timestamp.fromDate(date);
      }
      return Timestamp.now();
    };

    // Extract the base price once so we can use it in percentage math
    const basePrice = parseFloat(row['price']) || 0;

    // Helper function to safely calculate percentage
    const calculatePercentage = (commissionValue: number, price: number): number => {
      if (!price || price === 0) return 0; // Avoid Division by Zero
      // Calculates percentage and rounds to 2 decimal places to prevent floating point issues (e.g. 10.0000001)
      return parseFloat(((commissionValue / price) * 100).toFixed(2));
    };

    return {
      name: row['name'] ? String(row['name']).trim() : 'Unnamed Product',

      productCategory: (row['productCategory']
        ? String(row['productCategory']).trim()
        : 'EXCURSION') as Product['productCategory'],
      unitType: (row['unitType'] ? String(row['unitType']).trim() : 'UNIT') as Product['unitType'],
      transferType: (row['transferType']
        ? String(row['transferType']).trim()
        : TransferType.PRIVATE) as Product['transferType'],

      // Pushing the successfully mapped Item IDs!
      itemIds: newItemIds,

      validities: [
        {
          from: parseDate(row['validityFrom']),
          to: parseDate(row['validityTo']),
          price: basePrice,
        },
      ],

      salesRepCommission:
        calculatePercentage(parseFloat(row['salesRepComm']) || 0, basePrice) === 0.01
          ? 0
          : calculatePercentage(parseFloat(row['salesRepComm']) || 0, basePrice),
      toCommission:
        calculatePercentage(parseFloat(row['toComm']) || 0, basePrice) === 0.01
          ? 0
          : calculatePercentage(parseFloat(row['toComm']) || 0, basePrice),
      creditCardCommission:
        calculatePercentage(parseFloat(row['creditCardComm']) || 0, basePrice) === 0.01
          ? 0
          : calculatePercentage(parseFloat(row['creditCardComm']) || 0, basePrice),

      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }
}
