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
  // <-- ADDED CONSTRAINT
  /** A user-friendly name for the import type (e.g., "Hotel Partners") */
  name: string;

  /** The service required to add the document */
  service: BaseService<T>;

  /**
   * The core mapping logic.
   * Takes a parsed CSV row and maps it to your app's model.
   * Returns null if the row is invalid and should be skipped.
   */
  mapRow(row: CsvRow): Partial<T> | null; // <-- CHANGED TO Partial<T>

  prepare?(): Promise<void>;
}
