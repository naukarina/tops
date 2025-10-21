import { Component, Inject, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import {
  Observable,
  ReplaySubject,
  Subject,
  BehaviorSubject,
  of,
  Subscription,
  isObservable,
} from 'rxjs';
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
export class FilterDialogComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<FilterDialogComponent>);
  @Inject(MAT_DIALOG_DATA) public data: FilterDialogData = { filtersConfig: [], currentValues: {} };

  filterForm!: FormGroup;
  searchControls: { [key: string]: FormControl } = {};
  filteredOptionsReplay: { [key: string]: ReplaySubject<any[]> } = {};
  optionsSubjects: { [key: string]: BehaviorSubject<any[]> } = {};
  private optionSubscriptions: { [key: string]: Subscription } = {}; // Store subscriptions by key
  private _onDestroy = new Subject<void>();

  ngOnInit(): void {
    this.filterForm = this.fb.group({});
    console.log('Dialog data received:', this.data); // Debug: Check if config is passed

    this.data.filtersConfig.forEach((filter) => {
      const controlKey = this.getControlKey(filter.columnDef);
      const initialValue = this.data.currentValues[controlKey] ?? (filter.multiple ? [] : null);
      const control = new FormControl(initialValue);
      this.filterForm.addControl(controlKey, control);

      // --- Initialize Subjects ---
      this.optionsSubjects[controlKey] = new BehaviorSubject<any[]>([]);
      if (filter.searchable) {
        this.filteredOptionsReplay[controlKey] = new ReplaySubject<any[]>(1);
        this.searchControls[controlKey] = new FormControl('');
      }
      // --- End Initialize ---

      // --- Subscribe to Options ---
      // Unsubscribe previous if re-initializing (though unlikely in dialog context)
      this.optionSubscriptions[controlKey]?.unsubscribe();

      if (isObservable(filter.options)) {
        console.log(`Subscribing to observable options for: ${controlKey}`); // Debug
        this.optionSubscriptions[controlKey] = filter.options
          .pipe(takeUntil(this._onDestroy))
          .subscribe({
            next: (opts) => {
              const optionsArray = opts || [];
              console.log(`Received observable options for ${controlKey}:`, optionsArray); // Debug
              this.optionsSubjects[controlKey].next(optionsArray);
              if (filter.searchable) {
                // Ensure ReplaySubject exists before nexting
                if (!this.filteredOptionsReplay[controlKey]) {
                  this.filteredOptionsReplay[controlKey] = new ReplaySubject<any[]>(1);
                }
                // Directly trigger filtering based on the new options and current search term
                this.filterDropdownOptions(filter);
              }
            },
            error: (err) => console.error(`Error getting options for ${controlKey}:`, err), // Debug
          });
      } else {
        // Handle static array
        const optionsArray = filter.options || [];
        console.log(`Setting static options for ${controlKey}:`, optionsArray); // Debug
        this.optionsSubjects[controlKey].next(optionsArray);
        if (filter.searchable) {
          // Ensure ReplaySubject exists before nexting
          if (!this.filteredOptionsReplay[controlKey]) {
            this.filteredOptionsReplay[controlKey] = new ReplaySubject<any[]>(1);
          }
          this.filteredOptionsReplay[controlKey].next(optionsArray.slice()); // Initial population for search
        }
      }
      // --- End Subscribe ---

      // --- Setup Search Subscription (if searchable) ---
      if (filter.searchable) {
        // Ensure control exists before subscribing
        if (!this.searchControls[controlKey]) {
          this.searchControls[controlKey] = new FormControl('');
        }
        this.searchControls[controlKey].valueChanges
          .pipe(
            startWith(this.searchControls[controlKey].value || ''), // Use current value or empty string
            takeUntil(this._onDestroy)
          )
          .subscribe(() => {
            this.filterDropdownOptions(filter); // Pass filter config explicitly
          });
      }
      // --- End Setup ---
    });
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
    // Unsubscribe from all option observables using the stored subscriptions map
    Object.values(this.optionSubscriptions).forEach((sub) => sub.unsubscribe());
  }

  getControlKey(columnDef: any): string {
    return String(columnDef).replace(/[.\[\]]/g, '_');
  }

  private filterDropdownOptions(filterConfig: DropdownFilter<any>): void {
    const controlKey = this.getControlKey(filterConfig.columnDef);
    const currentFullOptions = this.optionsSubjects[controlKey]?.getValue();

    // Ensure all necessary parts exist before proceeding
    if (
      !currentFullOptions ||
      !this.searchControls[controlKey] ||
      !this.filteredOptionsReplay[controlKey]
    ) {
      console.warn(`filterDropdownOptions skipped for ${controlKey}: missing data`); // Debug
      this.filteredOptionsReplay[controlKey]?.next([]); // Emit empty array if things aren't ready
      return;
    }

    let search = this.searchControls[controlKey].value;

    if (!search) {
      this.filteredOptionsReplay[controlKey].next(currentFullOptions.slice());
      return;
    }

    search = search.toLowerCase();
    const optionTextProp = filterConfig.optionText;

    const filtered = currentFullOptions.filter((option) => {
      const text = optionTextProp ? option[optionTextProp] : option;
      return String(text ?? '')
        .toLowerCase()
        .includes(search);
    });
    this.filteredOptionsReplay[controlKey].next(filtered);
  }

  getSearchableOptions(filter: DropdownFilter<any>): Observable<any[]> {
    const controlKey = this.getControlKey(filter.columnDef);
    // Ensure ReplaySubject exists, otherwise return an empty observable
    return this.filteredOptionsReplay[controlKey]?.asObservable() ?? of([]);
  }

  getNonSearchableOptions(filter: DropdownFilter<any>): Observable<any[]> {
    const controlKey = this.getControlKey(filter.columnDef);
    // Ensure BehaviorSubject exists, otherwise return an empty observable
    return this.optionsSubjects[controlKey]?.asObservable() ?? of([]);
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
