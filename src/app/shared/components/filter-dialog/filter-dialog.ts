import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { Observable, ReplaySubject, Subject, isObservable, of, Subscription } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
import { DropdownFilter } from '../data-table/data-table';
import { SearchableSelectComponent } from '../searchable-select/searchable-select';

export interface FilterDialogData {
  filtersConfig: DropdownFilter<any>[];
  currentValues: { [key: string]: any };
}

@Component({
  selector: 'app-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
    NgxMatSelectSearchModule,
    SearchableSelectComponent,
  ],
  templateUrl: './filter-dialog.html',
  styleUrls: ['./filter-dialog.scss'],
})
export class FilterDialogComponent {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<FilterDialogComponent>);

  filterForm: FormGroup;
  private _onDestroy = new Subject<void>();

  constructor(@Inject(MAT_DIALOG_DATA) public data: FilterDialogData) {
    this.filterForm = this.fb.group({});
    console.log('FilterDialog constructor received data:', this.data);

    if (!this.data || !this.data.filtersConfig) {
      console.error('FilterDialog Error: No filtersConfig provided in data.');
      return;
    }

    this.data.filtersConfig.forEach((filter) => {
      const controlKey = this.getControlKey(filter.columnDef);
      const initialValue = this.data.currentValues[controlKey] ?? (filter.multiple ? [] : null);
      this.filterForm.addControl(controlKey, new FormControl(initialValue));
    });
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  getControlKey(columnDef: any): string {
    return String(columnDef).replace(/[.\[\]]/g, '_');
  }

  onApply(): void {
    this.dialogRef.close(this.filterForm.value);
  }

  onClear(): void {
    this.filterForm.reset();
    const clearedValues: { [key: string]: any } = {};
    Object.keys(this.filterForm.controls).forEach((key) => {
      const filterConfig = this.data.filtersConfig.find(
        (f) => this.getControlKey(f.columnDef) === key
      );
      clearedValues[key] = filterConfig?.multiple ? [] : null;
    });
    this.dialogRef.close(clearedValues);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
