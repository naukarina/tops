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
  ],
  templateUrl: './filter-dialog.html',
  styleUrls: ['./filter-dialog.scss'],
})
export class FilterDialogComponent {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<FilterDialogComponent>);

  filterForm: FormGroup;
  searchControls: { [key: string]: FormControl } = {};
  filteredOptionsReplay: { [key: string]: ReplaySubject<any[]> } = {};
  private optionSubscriptions: Subscription[] = [];
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

      const options$ = isObservable(filter.options) ? filter.options : of(filter.options || []);

      if (filter.searchable) {
        this.searchControls[controlKey] = new FormControl('');
        this.filteredOptionsReplay[controlKey] = new ReplaySubject<any[]>(1);

        const search$ = this.searchControls[controlKey].valueChanges.pipe(startWith(''));

        const sub = options$.pipe(takeUntil(this._onDestroy)).subscribe((opts) => {
          this.filterDropdownOptions(filter, opts); // Initial filter
        });
        this.optionSubscriptions.push(sub);

        const searchSub = search$.pipe(takeUntil(this._onDestroy)).subscribe(() => {
          // Re-filter when search term changes, using the latest options
          const optionsSub = options$.subscribe((opts) => this.filterDropdownOptions(filter, opts));
          // This inner subscription is fine because the outer one is managed by _onDestroy
          this.optionSubscriptions.push(optionsSub);
        });
        this.optionSubscriptions.push(searchSub);
      } else {
        // For non-searchable, just use a replay subject to hold the options
        this.filteredOptionsReplay[controlKey] = new ReplaySubject<any[]>(1);
        const sub = options$.pipe(takeUntil(this._onDestroy)).subscribe((opts) => {
          this.filteredOptionsReplay[controlKey].next(opts || []);
        });
        this.optionSubscriptions.push(sub);
      }
    });
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
    this.optionSubscriptions.forEach((sub) => sub.unsubscribe());
  }

  getControlKey(columnDef: any): string {
    return String(columnDef).replace(/[.\[\]]/g, '_');
  }

  private filterDropdownOptions(filterConfig: DropdownFilter<any>, options: any[]): void {
    const controlKey = this.getControlKey(filterConfig.columnDef);
    if (!options) {
      this.filteredOptionsReplay[controlKey]?.next([]);
      return;
    }

    let search = this.searchControls[controlKey]?.value;
    if (!search) {
      this.filteredOptionsReplay[controlKey].next(options.slice());
      return;
    }

    search = search.toLowerCase();
    const optionTextProp = filterConfig.optionText;

    this.filteredOptionsReplay[controlKey].next(
      options.filter((option) => {
        const text = optionTextProp ? option[optionTextProp] : option;
        return String(text ?? '')
          .toLowerCase()
          .includes(search);
      })
    );
  }

  getOptions(filter: DropdownFilter<any>): Observable<any[]> {
    const controlKey = this.getControlKey(filter.columnDef);
    return this.filteredOptionsReplay[controlKey]?.asObservable() ?? of([]);
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
