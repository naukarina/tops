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
  inject, // Import inject
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
import { MatSelectModule } from '@angular/material/select'; // Import MatSelectModule
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms'; // Import ReactiveFormsModule and FormBuilder/FormControl
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search'; // Import NgxMatSelectSearchModule
import {
  Observable,
  Subscription,
  isObservable,
  Subject,
  ReplaySubject,
  combineLatest,
} from 'rxjs'; // Import combineLatest, Subject, ReplaySubject
import { takeUntil, startWith, map } from 'rxjs/operators'; // Import operators
import { ColumnDefinition } from './column-definition.model';

// Define an interface for dropdown filters
export interface DropdownFilter<T> {
  columnDef: keyof T | string; // The property name to filter on (can use dot notation like 'contactInfo.country')
  placeholder: string; // Placeholder for the dropdown
  options: any[]; // Array of available options
  multiple: boolean; // Allow multiple selections?
  searchable: boolean; // Enable search within the dropdown?
  optionValue?: string; // Optional: Property name for option value (if options are objects)
  optionText?: string; // Optional: Property name for option display text (if options are objects)
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
    MatSelectModule, // Add MatSelectModule
    ReactiveFormsModule, // Add ReactiveFormsModule
    NgxMatSelectSearchModule, // Add NgxMatSelectSearchModule
    // MatSortModule, // Already imported via MatSort
    // MatSort, // Already imported via MatSort
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
})
export class DataTableComponent<T> implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  private fb = inject(FormBuilder); // Inject FormBuilder

  // --- Inputs ---
  @Input() dataInput: Observable<T[]> | T[] = [];
  @Input() columnDefinitions: ColumnDefinition<T>[] = [];
  @Input() displayedColumns: string[] = [];
  @Input() enableFilter = true; // Keep this for the general text filter
  @Input() enableSort = true;
  @Input() enablePaginator = true;
  @Input() pageSizeOptions = [5, 10, 20];
  @Input() filterPlaceholder = 'Search...'; // For the general text filter
  @Input() viewRoute?: (item: T) => string | any[];
  @Input() editRoute?: (item: T) => string | any[];
  @Input() enableDelete = false;
  @Input() dropdownFilters: DropdownFilter<T>[] = []; // Input for dropdown filters

  // --- Outputs ---
  @Output() deleteAction = new EventEmitter<T>();

  // --- Internal Properties ---
  dataSource = new MatTableDataSource<T>();
  private dataSubscription: Subscription | null = null;
  filterForm = this.fb.group({}); // Form group for all filters
  textFilterControl = new FormControl(''); // Separate control for text filter
  dropdownFilterControls: { [key: string]: FormControl } = {}; // Controls for dropdowns
  filteredOptions: { [key: string]: ReplaySubject<any[]> } = {}; // Filtered options for searchable dropdowns
  searchControls: { [key: string]: FormControl } = {}; // Search input controls for dropdowns

  private _onDestroy = new Subject<void>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInput']) {
      this.subscribeToData();
    }
    if (changes['dropdownFilters']) {
      this.setupFilterForm();
    }
  }

  ngOnInit() {
    this.setupFilterForm();
    this.subscribeToData(); // Initial subscription
    this.subscribeToFilters(); // Subscribe to filter changes
  }

  ngAfterViewInit() {
    this.setupDataSource();
  }

  ngOnDestroy() {
    this.dataSubscription?.unsubscribe();
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  private setupFilterForm(): void {
    // Clear previous dropdown controls
    Object.keys(this.dropdownFilterControls).forEach((key) => {
      this.filterForm.removeControl(key);
      this.filteredOptions[key]?.complete();
      this.searchControls[key] = new FormControl(''); // Reset search control
    });
    this.dropdownFilterControls = {};
    this.filteredOptions = {};
    this.searchControls = {};

    // Add text filter control if enabled
    if (this.enableFilter && !this.filterForm.contains('textFilter')) {
      this.filterForm.addControl('textFilter', this.textFilterControl);
    } else if (!this.enableFilter && this.filterForm.contains('textFilter')) {
      this.filterForm.removeControl('textFilter');
    }

    // Add dropdown filter controls
    this.dropdownFilters.forEach((filter) => {
      const control = new FormControl(filter.multiple ? [] : null);
      const controlKey = this.getControlKey(filter.columnDef);
      this.filterForm.addControl(controlKey, control);
      this.dropdownFilterControls[controlKey] = control;

      // Setup for searchable dropdowns
      if (filter.searchable) {
        this.filteredOptions[controlKey] = new ReplaySubject<any[]>(1);
        this.filteredOptions[controlKey].next(filter.options.slice());
        this.searchControls[controlKey] = new FormControl(''); // Add search control

        this.searchControls[controlKey].valueChanges
          .pipe(takeUntil(this._onDestroy))
          .subscribe(() => this.filterDropdownOptions(filter));
      }
    });
  }

  // Helper to create a safe key for form controls from columnDef
  getControlKey(columnDef: keyof T | string): string {
    return String(columnDef).replace('.', '_'); // Replace dots for nested properties
  }

  private filterDropdownOptions(filterConfig: DropdownFilter<T>): void {
    const controlKey = this.getControlKey(filterConfig.columnDef);
    if (
      !filterConfig.options ||
      !this.searchControls[controlKey] ||
      !this.filteredOptions[controlKey]
    ) {
      return;
    }

    let search = this.searchControls[controlKey].value;
    if (!search) {
      this.filteredOptions[controlKey].next(filterConfig.options.slice());
      return;
    }
    search = search.toLowerCase();

    const optionTextProp = filterConfig.optionText;

    this.filteredOptions[controlKey].next(
      filterConfig.options.filter((option) => {
        const text = optionTextProp ? option[optionTextProp] : option;
        return String(text).toLowerCase().includes(search);
      })
    );
  }

  private subscribeToData(): void {
    this.dataSubscription?.unsubscribe();

    const processData = (data: T[]) => {
      this.dataSource.data = data || [];
      this.applyCurrentFilters(); // Apply filters when data changes
      // Re-apply sort/pagination if dataSource is already initialized
      if (this.dataSource.sort) this.dataSource.sort = this.sort;
      if (this.dataSource.paginator) this.dataSource.paginator = this.paginator;
    };

    if (isObservable(this.dataInput)) {
      this.dataSubscription = this.dataInput.subscribe(processData);
    } else {
      processData(this.dataInput || []);
      this.setupDataSource();
    }
  }

  private subscribeToFilters(): void {
    this.filterForm.valueChanges
      .pipe(startWith(this.filterForm.value), takeUntil(this._onDestroy))
      .subscribe(() => {
        this.applyCurrentFilters();
      });
  }

  private applyCurrentFilters(): void {
    // Use filteringPredicate for combined filtering
    this.dataSource.filterPredicate = this.createFilterPredicate();
    // Trigger filtering by setting a unique value (JSON representation of filters)
    this.dataSource.filter = JSON.stringify(this.filterForm.value);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private createFilterPredicate(): (data: T, filter: string) => boolean {
    return (data: T, filterJson: string): boolean => {
      if (!filterJson) return true; // Should not happen with JSON.stringify

      try {
        const filters = JSON.parse(filterJson);
        let match = true;

        // Apply text filter
        const textFilter = filters.textFilter?.trim().toLowerCase();
        if (this.enableFilter && textFilter) {
          match = this.checkTextFilter(data, textFilter);
        }

        // Apply dropdown filters if text filter matches (or is not active)
        if (match) {
          match = this.checkDropdownFilters(data, filters);
        }

        return match;
      } catch (e) {
        console.error('Error parsing filter JSON:', e);
        return true; // Don't filter if JSON is invalid
      }
    };
  }

  // Checks if the row matches the general text filter
  private checkTextFilter(data: T, textFilter: string): boolean {
    // Search through all defined columns' cell values
    return this.columnDefinitions.some((colDef) => {
      const cellValue = colDef.cell(data);
      return cellValue != null && String(cellValue).toLowerCase().includes(textFilter);
    });
  }

  // Checks if the row matches the selected dropdown filter values
  private checkDropdownFilters(data: T, filters: any): boolean {
    for (const filterConfig of this.dropdownFilters) {
      const controlKey = this.getControlKey(filterConfig.columnDef);
      const selectedValues = filters[controlKey];

      // Skip if no value selected for this filter
      if (
        selectedValues === null ||
        selectedValues === undefined ||
        (Array.isArray(selectedValues) && selectedValues.length === 0)
      ) {
        continue;
      }

      // Get the actual data value for the column
      const dataValue = this.getPropertyValue(data, filterConfig.columnDef as string);

      // Check for match
      if (filterConfig.multiple && Array.isArray(selectedValues)) {
        // If multiple selections, check if the data value is in the selected array
        if (!selectedValues.includes(dataValue)) {
          return false; // Does not match this filter
        }
      } else {
        // If single selection, check for direct equality
        if (dataValue !== selectedValues) {
          return false; // Does not match this filter
        }
      }
    }
    return true; // Matches all active dropdown filters
  }

  // Helper to get nested property values (e.g., 'contactInfo.country')
  private getPropertyValue(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o && o[key] !== 'undefined' ? o[key] : null), obj);
  }

  private setupDataSource(): void {
    if (this.enableSort && this.sort) {
      this.dataSource.sort = this.sort;
    }
    if (this.enablePaginator && this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    // Initial filter application after setup
    this.dataSource.filterPredicate = this.createFilterPredicate();
    this.dataSource.filter = JSON.stringify(this.filterForm.value);
  }

  // applyFilter is now only for the text input
  applyTextFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.textFilterControl.setValue(filterValue); // Update the form control which triggers the combined filter
  }

  onDeleteClick(item: T) {
    this.deleteAction.emit(item);
  }

  get showActionsColumn(): boolean {
    return (
      this.displayedColumns.includes('actions') &&
      (!!this.viewRoute || !!this.editRoute || this.enableDelete)
    );
  }
}
