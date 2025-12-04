// src/app/pages/migration/migration-page/migration-page.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
// Make sure PapaParse is imported correctly
import * as Papa from 'papaparse';
// Import CsvRow and IImportStrategy
import { IImportStrategy, CsvRow } from '../import-strategy.interface';
import { BaseDocument } from '../../../models/base-document.model';
import { HotelImportStrategy } from '../strategies/hotel-import.strategy';
import { TourOperatorImportStrategy } from '../strategies/tour-operator-import.strategy';
import { SupplierImportStrategy } from '../strategies/supplier-import.strategy';

@Component({
  selector: 'app-migration-page',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatButtonModule, MatFormFieldModule],
  template: `
    <h2>Data Import Tool</h2>

    <mat-form-field appearance="outline">
      <mat-label>Select Import Type</mat-label>
      <mat-select [(value)]="selectedStrategy">
        <mat-option *ngFor="let s of allStrategies" [value]="s">
          {{ s.name }}
        </mat-option>
      </mat-select>
    </mat-form-field>

    <br />
    <br />

    <input type="file" (change)="onFileSelected($event)" accept=".csv" #fileInput />

    <br /><br />

    <button
      mat-raised-button
      color="primary"
      (click)="runImport()"
      [disabled]="!selectedStrategy || !file"
    >
      Run Import
    </button>

    <div *ngIf="log.length > 0" class="import-log">
      <h3>Import Log:</h3>
      <pre *ngFor="let entry of log" [class.error-log]="entry.startsWith('ERROR')">{{ entry }}</pre>
    </div>
  `,
  styles: [
    /* ... styles remain the same ... */
  ],
})
export class MigrationPageComponent {
  private hotelStrategy = inject(HotelImportStrategy);
  private tourOperatorStrategy = inject(TourOperatorImportStrategy);
  private supplierStrategy = inject(SupplierImportStrategy);

  allStrategies: IImportStrategy<any & BaseDocument>[] = [
    this.hotelStrategy,
    this.tourOperatorStrategy,
    this.supplierStrategy,
  ];

  selectedStrategy: IImportStrategy<any & BaseDocument> | null = null;
  file: File | null = null;
  log: string[] = [];

  onFileSelected(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.file = fileList[0];
      this.log = []; // Clear log when a new file is selected
    } else {
      this.file = null;
    }
  }

  runImport() {
    if (!this.file || !this.selectedStrategy) {
      this.log = ['Error: No file selected or import type not chosen.'];
      return;
    }

    const fileToParse: File = this.file;
    const strategy = this.selectedStrategy;

    this.log = [`Starting import for: ${strategy.name}...`, `Processing file: ${fileToParse.name}`];

    Papa.parse<CsvRow>(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        if (!results.data || rows.length === 0) {
          this.log.push('CSV file is empty or could not be parsed correctly.');
          return;
        }
        this.log.push(`Found ${rows.length} data rows in CSV (excluding header).`);
        if (results.errors.length > 0) {
          this.log.push(`Encountered ${results.errors.length} parsing errors:`);
          results.errors.forEach((err) => this.log.push(`  - Row ${err.row}: ${err.message}`));
        }

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const [index, row] of rows.entries()) {
          const rowNumber = index + 2;
          try {
            if (Object.values(row).every((val) => val === null || val?.trim() === '')) {
              this.log.push(`SKIPPED row ${rowNumber}: Row appears to be empty.`);
              skippedCount++;
              continue;
            }

            const mappedItem = strategy.mapRow(row);

            if (mappedItem) {
              await strategy.service.add(mappedItem as any);
              successCount++;
            } else {
              this.log.push(
                `SKIPPED row ${rowNumber}: Invalid or incomplete data according to mapping rules.`
              );
              skippedCount++;
            }
          } catch (error: any) {
            this.log.push(
              `ERROR row ${rowNumber}: Failed to import: ${
                error.message || 'Unknown error'
              } | Data: ${JSON.stringify(row)}`
            );
            errorCount++;
          }
        }

        this.log.push('--- IMPORT COMPLETE ---');
        this.log.push(`Successfully imported: ${successCount}`);
        this.log.push(`Failed imports (errors): ${errorCount}`);
        this.log.push(`Skipped rows (invalid/empty): ${skippedCount}`);
        this.log.push(
          `Total rows processed: ${successCount + errorCount + skippedCount} / ${rows.length}`
        );
      },
      // --- FIX: Change the error callback signature ---
      error: (error: Error, file: File) => {
        // ---
        // Even though Papa.ParseError has more specific fields,
        // using the base 'Error' type satisfies TypeScript here.
        // You can still access specific fields if needed with type assertion:
        const parseError = error as unknown as Papa.ParseError;
        this.log.push(`FATAL CSV PARSE ERROR: ${error.message}`);
        if (parseError.row !== undefined) {
          // Check specific fields via assertion
          this.log.push(`  Error occurred near row: ${parseError.row}`);
        }
        // Log the file name if relevant
        this.log.push(`  File: ${file.name}`);
      },
    });
  }
}
