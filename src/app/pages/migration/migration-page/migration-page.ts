// src/app/pages/migration/migration-page/migration-page.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import * as Papa from 'papaparse';

import { IImportStrategy } from '../import-strategy.interface';
import { BaseDocument } from '../../../models/base-document.model'; // <-- IMPORT THIS
import { HotelImportStrategy } from '../strategies/hotel-import.strategy';

@Component({
  selector: 'app-migration-page',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatButtonModule, MatFormFieldModule],
  template: `
    <h2>Data Import Tool</h2>

    <mat-form-field>
      <mat-label>Select Import Type</mat-label>
      <mat-select [(value)]="selectedStrategy">
        <mat-option *ngFor="let s of allStrategies" [value]="s">
          {{ s.name }}
        </mat-option>
      </mat-select>
    </mat-form-field>

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

    <div *ngIf="log.length > 0">
      <h3>Import Log:</h3>
      <pre *ngFor="let entry of log" [class.error-log]="entry.startsWith('ERROR')">{{ entry }}</pre>
    </div>
  `,
  styles: [
    `
      .error-log {
        color: red;
        font-weight: bold;
      }
      pre {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    `,
  ],
})
export class MigrationPageComponent {
  // Update type to IImportStrategy<any & BaseDocument>
  allStrategies: IImportStrategy<any & BaseDocument>[] = [inject(HotelImportStrategy)];

  selectedStrategy: IImportStrategy<any & BaseDocument> | null = null;
  file: File | null = null;
  log: string[] = [];

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  runImport() {
    if (!this.file || !this.selectedStrategy) {
      return;
    }

    const strategy = this.selectedStrategy;
    this.log = [`Starting import for: ${strategy.name}...`];

    Papa.parse(this.file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        this.log.push(`Found ${rows.length} rows in CSV.`);

        let successCount = 0;
        let errorCount = 0;

        for (const [index, row] of rows.entries()) {
          try {
            const mappedItem = strategy.mapRow(row);

            if (mappedItem) {
              // *** THIS IS THE KEY CHANGE ***
              // Cast the Partial<T> to T for the add method.
              await strategy.service.add(mappedItem as any); // Using 'as any' is simplest here
              successCount++;
            } else {
              this.log.push(`SKIPPED row ${index + 2}: Invalid data: ${JSON.stringify(row)}`);
              errorCount++;
            }
          } catch (error: any) {
            this.log.push(
              `ERROR row ${index + 2}: Failed to import: ${error.message} | Data: ${JSON.stringify(
                row
              )}`
            );
            errorCount++;
          }
        }

        this.log.push('--- IMPORT COMPLETE ---');
        this.log.push(`Successfully imported: ${successCount}`);
        this.log.push(`Failed or skipped: ${errorCount}`);
      },
      error: (err) => {
        this.log.push(`CSV PARSE ERROR: ${err.message}`);
      },
    });
  }
}
