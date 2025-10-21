// src/app/shared/components/data-table/data-table.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  SimpleChanges,
  OnChanges,
  inject,
  computed, // Import computed
  signal, // Import signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // Import MatDialog, MatDialogModule
import {
  Observable,
  Subscription,
  isObservable,
  Subject,
  ReplaySubject,
  BehaviorSubject,
  of,
  combineLatest,
} from 'rxjs';
import {
  takeUntil,
  startWith,
  map,
  distinctUntilChanged,
  filter as rxFilter,
} from 'rxjs/operators'; // Import rxFilter
import { ColumnDefinition } from './column-definition.model';
// Import the Filter Dialog Component and its data interface
import { FilterDialogComponent, FilterDialogData } from '../filter-dialog/filter-dialog';
import { MatBadgeModule } from '@angular/material/badge'; // Import MatBadgeModule

export interface DropdownFilter<T> {
  columnDef: keyof T | string;
  placeholder: string;
  options: any[] | Observable<any[]>;
  multiple: boolean;
  searchable: boolean;
  optionValue?: string;
  optionText?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    ReactiveFormsModule,
    NgxMatSelectSearchModule,
    MatDialogModule, // Add MatDialogModule
    MatBadgeModule, // Add MatBadgeModule
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
})
export class DataTableComponent<T> implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog); // Inject MatDialog

  // Inputs remain the same...
  @Input() dataInput: Observable<T[]> | T[] = [];
  @Input() columnDefinitions: ColumnDefinition<T>[] = [];
  @Input() displayedColumns: string[] = [];
  @Input() enableFilter = true;
  @Input() enableSort = true;
  @Input() enablePaginator = true;
  @Input() pageSizeOptions = [5, 10, 20];
  @Input() filterPlaceholder = 'Search...';
  @Input() viewRoute?: (item: T) => string | any[];
  @Input() editRoute?: (item: T) => string | any[];
  @Input() enableDelete = false;
  @Input() dropdownFilters: DropdownFilter<T>[] = [];

  @Output() deleteAction = new EventEmitter<T>();

  dataSource = new MatTableDataSource<T>();
  private dataSubscription: Subscription | null = null;
  filterForm = this.fb.group({});
  textFilterControl = new FormControl('');
  dropdownFilterControls: { [key: string]: FormControl } = {};
  // Search controls and options logic removed as it moves to the dialog

  // --- Signal for active dropdown filters ---
  private activeDropdownFilters = signal<{ [key: string]: any }>({});
  activeFilterCount = computed(() => {
    const filters = this.activeDropdownFilters();
    return Object.values(filters).filter((value) =>
      Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined
    ).length;
  });
  // ---

  private _onDestroy = new Subject<void>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // No changes in ngOnChanges, ngOnInit, ngAfterViewInit, ngOnDestroy needed for dialog logic itself

  ngOnInit() {
    this.setupFilterForm(); // Still needed to create controls
    this.subscribeToData();
    this.subscribeToFilters();
  }

  ngOnDestroy() {
    this.dataSubscription?.unsubscribe();
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  // Simplified: only creates controls now
  private setupFilterForm(): void {
    Object.keys(this.dropdownFilterControls).forEach((key) => {
      this.filterForm.removeControl(key);
    });
    this.dropdownFilterControls = {};

    if (this.enableFilter && !this.filterForm.contains('textFilter')) {
      this.filterForm.addControl('textFilter', this.textFilterControl);
    } else if (!this.enableFilter && this.filterForm.contains('textFilter')) {
      this.filterForm.removeControl('textFilter');
    }

    this.dropdownFilters.forEach((filter) => {
      const controlKey = this.getControlKey(filter.columnDef);
      const control = new FormControl(filter.multiple ? [] : null); // Initialize empty
      this.filterForm.addControl(controlKey, control);
      this.dropdownFilterControls[controlKey] = control;
    });

    // Initialize active filters signal
    this.updateActiveFiltersSignal();
  }

  getControlKey(columnDef: keyof T | string): string {
    return String(columnDef).replace(/[.\[\]]/g, '_');
  }

  // filterDropdownOptions removed - handled by dialog now

  private subscribeToData(): void {
    // ... (no changes needed here)
    this.dataSubscription?.unsubscribe();

    const processData = (data: T[]) => {
      this.dataSource.data = data || [];
      this.applyCurrentFilters();
      if (this.dataSource.sort) this.dataSource.sort = this.sort;
      if (this.dataSource.paginator) this.dataSource.paginator = this.paginator;
    };

    if (isObservable(this.dataInput)) {
      this.dataSubscription = this.dataInput
        .pipe(takeUntil(this._onDestroy))
        .subscribe(processData);
    } else {
      processData(this.dataInput || []);
      this.setupDataSource();
    }
  }

  private subscribeToFilters(): void {
    // Listen to changes in the filterForm (triggered by text input or dialog)
    this.filterForm.valueChanges
      .pipe(
        startWith(this.filterForm.value),
        takeUntil(this._onDestroy)
        // distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)) // Optional: prevent re-filtering if value object is same
      )
      .subscribe(() => {
        this.applyCurrentFilters();
        this.updateActiveFiltersSignal(); // Update badge count
      });
  }

  // Update the signal holding dropdown filter values
  private updateActiveFiltersSignal(): void {
    const dropdownValues: { [key: string]: any } = {};
    for (const key in this.dropdownFilterControls) {
      if (this.filterForm.contains(key)) {
        // Ensure control exists
        dropdownValues[key] = this.filterForm.get(key)?.value;
      }
    }
    this.activeDropdownFilters.set(dropdownValues);
  }

  private applyCurrentFilters(): void {
    // ... (no changes needed here)
    this.dataSource.filterPredicate = this.createFilterPredicate();
    this.dataSource.filter = JSON.stringify(this.filterForm.value);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private createFilterPredicate(): (data: T, filter: string) => boolean {
    // ... (no changes needed here)
    return (data: T, filterJson: string): boolean => {
      if (!filterJson) return true;

      try {
        const filters = JSON.parse(filterJson);
        let match = true;

        const textFilter = filters.textFilter?.trim().toLowerCase();
        if (this.enableFilter && textFilter) {
          match = this.checkTextFilter(data, textFilter);
        }

        if (match) {
          match = this.checkDropdownFilters(data, filters);
        }

        return match;
      } catch (e) {
        console.error('Error parsing filter JSON:', e);
        return true;
      }
    };
  }

  private checkTextFilter(data: T, textFilter: string): boolean {
    // ... (no changes needed here)
    return this.columnDefinitions.some((colDef) => {
      const cellValue = colDef.cell(data);
      return cellValue != null && String(cellValue).toLowerCase().includes(textFilter);
    });
  }

  private checkDropdownFilters(data: T, filters: any): boolean {
    // ... (no changes needed here)
    for (const filterConfig of this.dropdownFilters) {
      const controlKey = this.getControlKey(filterConfig.columnDef);
      const selectedValues = filters[controlKey];

      if (
        selectedValues === null ||
        selectedValues === undefined ||
        (Array.isArray(selectedValues) && selectedValues.length === 0)
      ) {
        continue;
      }

      const dataValue = this.getPropertyValue(data, filterConfig.columnDef as string);
      const dataValueString =
        dataValue === null || dataValue === undefined ? '' : String(dataValue);

      if (filterConfig.multiple && Array.isArray(selectedValues)) {
        const selectedValuesStr = selectedValues.map(String);
        if (!selectedValuesStr.includes(dataValueString)) {
          return false;
        }
      } else {
        if (String(selectedValues) !== dataValueString) {
          return false;
        }
      }
    }
    return true;
  }

  private getPropertyValue(obj: any, path: string): any {
    // ... (no changes needed here)
    return path
      .split('.')
      .reduce((o, key) => (o && o[key] !== undefined && o[key] !== null ? o[key] : null), obj);
  }

  private setupDataSource(): void {
    // ... (no changes needed here)
    if (this.enableSort && this.sort) {
      this.dataSource.sort = this.sort;
    }
    if (this.enablePaginator && this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    this.dataSource.filterPredicate = this.createFilterPredicate();
    this.dataSource.filter = JSON.stringify(this.filterForm.value ?? {});
  }

  applyTextFilter(event: Event) {
    // ... (no changes needed here)
    const filterValue = (event.target as HTMLInputElement).value;
    this.textFilterControl.setValue(filterValue);
  }

  onDeleteClick(item: T) {
    // ... (no changes needed here)
    this.deleteAction.emit(item);
  }

  get showActionsColumn(): boolean {
    // ... (no changes needed here)
    return (
      this.displayedColumns.includes('actions') &&
      (!!this.viewRoute || !!this.editRoute || this.enableDelete)
    );
  }

  // --- NEW METHOD to open the dialog ---
  openFilterDialog(): void {
    // Get current dropdown values from the form
    const currentDropdownValues: { [key: string]: any } = {};
    Object.keys(this.dropdownFilterControls).forEach((key) => {
      currentDropdownValues[key] = this.filterForm.get(key)?.value;
    });

    const dialogRef = this.dialog.open<
      FilterDialogComponent,
      FilterDialogData,
      { [key: string]: any }
    >(FilterDialogComponent, {
      width: '400px', // Adjust width as needed
      data: {
        filtersConfig: this.dropdownFilters,
        currentValues: currentDropdownValues, // Pass current values
      },
    });

    dialogRef
      .afterClosed()
      .pipe(rxFilter((result) => result !== undefined)) // Only proceed if a result was returned (not cancelled)
      .subscribe((result) => {
        // Update the form controls with the values from the dialog
        if (result) {
          Object.keys(result).forEach((key) => {
            if (this.filterForm.contains(key)) {
              // Use patchValue to update only the dropdown controls, preserving the text filter
              this.filterForm.patchValue({ [key]: result[key] }, { emitEvent: false }); // Avoid immediate re-trigger
            }
          });
          // Manually trigger valueChanges once after patching all values
          this.filterForm.updateValueAndValidity({ onlySelf: false, emitEvent: true });
        }
      });
  }
  // --- END NEW METHOD ---
}
