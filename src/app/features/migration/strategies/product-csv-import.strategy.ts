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

  // THE FIX: Aggressive normalization to ignore spaces, dashes, and special chars
  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
  }

  async beforeImport(): Promise<void> {
    console.log('Fetching new items database for ID cross-referencing...');
    this.itemNameMap.clear();

    try {
      const result = this.itemService.getAll
        ? this.itemService.getAll()
        : (this.itemService as any).get();

      const allItems = isObservable(result) ? await firstValueFrom(result) : await result;

      allItems.forEach((item: any) => {
        if (item.name && item.id) {
          // Use aggressive normalization on the DB names
          const normalizedName = this.normalizeString(item.name);
          this.itemNameMap.set(normalizedName, item.id);
        }
      });
      console.log(`✅ Loaded ${this.itemNameMap.size} items into memory for ID matching.`);
    } catch (error) {
      console.error('❌ Failed to load items.', error);
    }
  }

  mapRow(row: CsvRow): Partial<Product> | null {
    const newItemIds: string[] = [];
    const formula = row['itemsCostFormula'] || '';

    if (formula) {
      // THE FIX: Split using Regex to handle variations in spacing around the '+'
      const itemEntries = formula.split(/\s*\+\s*/);

      for (const entry of itemEntries) {
        // Remove the pricing block at the end e.g., "(1800/2070)"
        const extractedName = entry.replace(/\s*\([^)]+\)\s*$/, '').trim();

        if (extractedName) {
          // Use aggressive normalization on the CSV extracted names
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

    return {
      name: row['name'] ? String(row['name']).trim() : 'Unnamed Product',

      productCategory: 'EXCURSION' as Product['productCategory'],
      unitType: (row['unitType'] ? String(row['unitType']).trim() : 'UNIT') as Product['unitType'],
      transferType: (row['transferType']
        ? String(row['transferType']).trim()
        : TransferType.SIC) as Product['transferType'],

      // Linked Items
      itemIds: newItemIds,

      validities: [
        {
          from: parseDate(row['validityFrom']),
          to: parseDate(row['validityTo']),
          price: parseFloat(row['price']) || 0,
        },
      ],

      salesRepCommission: parseFloat(row['salesRepComm']) || 0,
      toCommission: parseFloat(row['toComm']) || 0,
      creditCardCommission: parseFloat(row['creditCardComm']) || 0,

      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }
}
