// src/app/features/migration/import-strategy.interface.ts
import { BaseService } from '../../core/services/base.service';

import { BaseDocument } from 'src/app/core/models/base-document.model'; // <-- IMPORT THIS

/**
 * Represents one row of parsed CSV data.
 * The keys are the CSV headers.
 */
export interface CsvRow {
  [header: string]: string;
}

/**
 * Defines the contract for an import strategy.
 */
export interface IImportStrategy<T extends BaseDocument> {
  name: string;
  service: any; // Or your BaseService<T> type

  // ADD THIS LINE (The ? makes it optional so it won't break your other strategies)
  beforeImport?(): Promise<void>;

  mapRow(row: CsvRow): Partial<T> | null;

  prepare?(): Promise<void>;
}
