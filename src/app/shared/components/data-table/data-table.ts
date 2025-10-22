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
  computed,
  signal,
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, Subscription, isObservable, Subject, of } from 'rxjs';
import { takeUntil, startWith, filter as rxFilter, map } from 'rxjs/operators';
import { ColumnDefinition } from './column-definition.model';
import { FilterDialogComponent, FilterDialogData } from '../filter-dialog/filter-dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { SelectionModel } from '@angular/cdk/collections';

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
    MatDialogModule,
    MatBadgeModule,
    MatCheckboxModule,
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
})
export class DataTableComponent<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @Input() dataInput: Observable<T[]> | T[] = [];
  @Input() columnDefinitions: ColumnDefinition<T>[] = [];
  @Input() set displayedColumnsInput(cols: string[]) {
    this._displayedColumnsInput = cols;
    this.updateDisplayedColumns();
  }
  private _displayedColumnsInput: string[] = [];
  displayedColumns: string[] = []; // This will hold the final array including 'select' if enabled
  selection = new SelectionModel<T>(true, []); // Allow multi-select, start empty

  // New input to enable selection
  @Input() enableSelection = false;
  @Input() enableFilter = true;
  @Input() enableSort = true;
  @Input() enablePaginator = true;
  @Input() pageSizeOptions = [5, 10, 20];
  @Input() filterPlaceholder = 'Search...';
  @Input() viewRoute?: (item: T) => string | any[];
  @Input() editRoute?: (item: T) => string | any[];
  @Input() enableDelete = false;
  @Input() dropdownFilters: DropdownFilter<T>[] = [];
  @Input() title = '';
  @Input() newRoute = '';
  @Input() newButtonText = 'Add New';

  @Output() deleteAction = new EventEmitter<T>();

  dataSource = new MatTableDataSource<T>();
  private dataSubscription: Subscription | null = null;
  filterForm = this.fb.group({});
  textFilterControl = new FormControl('');
  dropdownFilterControls: { [key: string]: FormControl } = {};

  private activeDropdownFilters = signal<{ [key: string]: any }>({});
  activeFilterCount = computed(() => {
    const filters = this.activeDropdownFilters();
    return Object.values(filters).filter((value) =>
      Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined
    ).length;
  });

  private _onDestroy = new Subject<void>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit() {
    this.updateDisplayedColumns(); // Call here to set initial columns
    this.setupFilterForm();
    this.subscribeToData();
    this.subscribeToFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInput'] && !changes['dataInput'].firstChange) {
      this.subscribeToData();
      // Clear selection when data changes if needed
      // this.selection.clear();
    }
    if (changes['dropdownFilters'] && !changes['dropdownFilters'].firstChange) {
      this.setupFilterForm();
    }
    if (changes['enableSelection'] || changes['displayedColumnsInput']) {
      this.updateDisplayedColumns();
    }
  }

  ngAfterViewInit() {
    if (!this.dataSource) {
      this.dataSource = new MatTableDataSource<T>([]);
    }
    // Set the custom accessor BEFORE assigning the sort object
    this.dataSource.sortingDataAccessor = (item: T, property: string) => {
      // Use the existing helper function to get nested properties
      return this.getPropertyValue(item, property);
    };
    // Now assign sort and paginator
    this.setupDataSource();
  }

  ngOnDestroy() {
    this.dataSubscription?.unsubscribe();
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  // Helper to dynamically set displayedColumns
  private updateDisplayedColumns(): void {
    const baseColumns =
      this._displayedColumnsInput || this.columnDefinitions.map((c) => c.columnDef);
    this.displayedColumns = this.enableSelection ? ['select', ...baseColumns] : baseColumns;
    // Ensure actions column is added if needed (based on the original logic)
    if (
      !this.displayedColumns.includes('actions') &&
      (!!this.viewRoute || !!this.editRoute || this.enableDelete)
    ) {
      this.displayedColumns.push('actions');
    }
  }

  private setupFilterForm(): void {
    // Clear previous controls
    Object.keys(this.dropdownFilterControls).forEach((key) => this.filterForm.removeControl(key));
    this.dropdownFilterControls = {};

    // Setup text filter control
    if (this.enableFilter && !this.filterForm.contains('textFilter')) {
      this.filterForm.addControl('textFilter', this.textFilterControl);
    }

    // Setup dropdown controls
    this.dropdownFilters.forEach((filter) => {
      const controlKey = this.getControlKey(filter.columnDef);
      const control = new FormControl(filter.multiple ? [] : null);
      this.filterForm.addControl(controlKey, control);
      this.dropdownFilterControls[controlKey] = control;
    });
    this.updateActiveFiltersSignal();
  }

  getControlKey(columnDef: keyof T | string): string {
    return String(columnDef).replace(/[.\[\]]/g, '_');
  }

  private subscribeToData(): void {
    this.dataSubscription?.unsubscribe();
    const processData = (data: T[]) => {
      if (!this.dataSource) {
        this.dataSource = new MatTableDataSource<T>(data || []);
        // Set accessor here too in case AfterViewInit runs before data arrives
        this.dataSource.sortingDataAccessor = (item: T, property: string) => {
          return this.getPropertyValue(item, property);
        };
      } else {
        this.dataSource.data = data || [];
      }
      // Re-apply filters whenever data changes
      this.applyCurrentFilters();
      // Apply pagination/sort AFTER data is loaded and filters applied
      // This ensures paginator length is correct
      this.setupDataSource();
      // Clear selection when underlying data changes significantly
      this.selection.clear();
    };

    if (isObservable(this.dataInput)) {
      this.dataSubscription = this.dataInput
        .pipe(
          takeUntil(this._onDestroy),
          // Get the data that passes the current filters for selection logic
          map((data) => {
            this.dataSource.data = data || []; // Update internal data first
            this.applyCurrentFilters(); // Apply filters
            return this.dataSource.filteredData; // Pass filtered data downstream if needed
          })
        )
        .subscribe((filteredData) => {
          // Use filteredData if needed for selection checks, or just use dataSource.data/filteredData directly
          processData(this.dataSource.data); // Still process original data but filters are applied now
        });
    } else {
      if (!this.dataSource) {
        this.dataSource = new MatTableDataSource<T>([]);
        this.dataSource.sortingDataAccessor = (item: T, property: string) => {
          return this.getPropertyValue(item, property);
        };
      }
      processData(this.dataInput || []);
    }
  }

  private subscribeToFilters(): void {
    this.filterForm.valueChanges
      .pipe(startWith(this.filterForm.value), takeUntil(this._onDestroy))
      .subscribe(() => {
        this.applyCurrentFilters();
        this.updateActiveFiltersSignal();
      });
  }

  private updateActiveFiltersSignal(): void {
    const dropdownValues: { [key: string]: any } = {};
    this.dropdownFilters.forEach((filter) => {
      const controlKey = this.getControlKey(filter.columnDef);
      if (this.filterForm.contains(controlKey)) {
        dropdownValues[controlKey] = this.filterForm.get(controlKey)?.value;
      }
    });
    this.activeDropdownFilters.set(dropdownValues);
  }

  private applyCurrentFilters(): void {
    this.dataSource.filterPredicate = this.createFilterPredicate();
    this.dataSource.filter = JSON.stringify(this.filterForm.value);
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private createFilterPredicate(): (data: T, filter: string) => boolean {
    return (data: T, filterJson: string): boolean => {
      try {
        const filters = JSON.parse(filterJson);
        const textFilter = filters.textFilter?.trim().toLowerCase();

        const textMatch =
          !this.enableFilter || !textFilter || this.checkTextFilter(data, textFilter);
        const dropdownMatch = this.checkDropdownFilters(data, filters);

        return textMatch && dropdownMatch;
      } catch (e) {
        return true;
      }
    };
  }

  private checkTextFilter(data: T, textFilter: string): boolean {
    return this.columnDefinitions.some((colDef) => {
      const cellValue = colDef.cell(data);
      return cellValue != null && String(cellValue).toLowerCase().includes(textFilter);
    });
  }

  private checkDropdownFilters(data: T, filters: any): boolean {
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
        if (!selectedValues.map(String).includes(dataValueString)) return false;
      } else {
        if (String(selectedValues) !== dataValueString) return false;
      }
    }
    return true;
  }

  private getPropertyValue(obj: any, path: string): any {
    // If no path or object is null/undefined, return it as is
    if (!path || obj === null || typeof obj === 'undefined') {
      return obj;
    }
    // Handle potential direct access if path has no dots
    if (path.indexOf('.') === -1) {
      return obj[path];
    }
    // Handle nested properties
    return path
      .split('.')
      .reduce((o, key) => (o && o[key] !== undefined && o[key] !== null ? o[key] : null), obj);
  }

  private setupDataSource(): void {
    if (this.sort && this.dataSource) {
      // Check dataSource exists
      // The custom sortingDataAccessor is already set in ngAfterViewInit
      this.dataSource.sort = this.sort;
    } else if (this.enableSort) {
      console.warn(
        'DataTableComponent: MatSort ViewChild is not available or dataSource not ready.'
      );
    }
    if (this.paginator && this.dataSource) {
      // Check dataSource exists
      this.dataSource.paginator = this.paginator;
    } else if (this.enablePaginator) {
      console.warn(
        'DataTableComponent: MatPaginator ViewChild is not available or dataSource not ready.'
      );
    }
  }

  applyTextFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.textFilterControl.setValue(filterValue);
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

  openFilterDialog(): void {
    const currentDropdownValues: { [key: string]: any } = {};
    this.dropdownFilters.forEach((filter) => {
      const controlKey = this.getControlKey(filter.columnDef);
      if (this.filterForm.contains(controlKey)) {
        currentDropdownValues[controlKey] = this.filterForm.get(controlKey)?.value;
      }
    });

    if (!this.dropdownFilters || this.dropdownFilters.length === 0) {
      console.error('DataTable: No dropdownFilters provided to openFilterDialog.');
      return;
    }

    const dialogRef = this.dialog.open<
      FilterDialogComponent,
      FilterDialogData,
      { [key: string]: any }
    >(FilterDialogComponent, {
      width: '400px',
      data: {
        filtersConfig: this.dropdownFilters, // Pass the @Input property directly
        currentValues: currentDropdownValues,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(rxFilter((result) => result !== undefined))
      .subscribe((result) => {
        if (result) {
          this.filterForm.patchValue(result); // This will trigger the valueChanges subscription
        }
      });
  }

  // --- Selection Methods ---

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    // Consider only currently visible/filtered rows for "select all" state
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows && numRows > 0;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    // Select all *filtered* rows
    this.selection.select(...this.dataSource.filteredData);
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: T): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    // Assuming your data objects have an 'id' property. Adjust if necessary.
    const id = (row as any)['id'] || JSON.stringify(row);
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${id}`;
  }

  // --- CSV Export Method ---
  extractToCsv(): void {
    if (this.selection.selected.length === 0) {
      alert('Please select rows to extract.');
      return;
    }

    const dataToExport = this.selection.selected;
    const columns = this.columnDefinitions.filter((cd) =>
      this._displayedColumnsInput.includes(cd.columnDef)
    ); // Use the input columns

    // 1. Create Headers
    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');

    // 2. Create Rows
    const rows = dataToExport.map((item) => {
      return columns
        .map((col) => {
          let cellValue = col.cell(item);
          // Handle null/undefined
          if (cellValue === null || typeof cellValue === 'undefined') {
            cellValue = '';
          }
          // Basic escaping for CSV (quotes and commas)
          const stringValue = String(cellValue).replace(/"/g, '""');
          // Wrap in quotes if it contains comma, newline, or quote
          if (
            stringValue.includes(',') ||
            stringValue.includes('\n') ||
            stringValue.includes('"')
          ) {
            return `"${stringValue}"`;
          }
          return stringValue;
        })
        .join(',');
    });

    // 3. Combine Headers and Rows
    const csvContent = `${headers}\n${rows.join('\n')}`;

    // 4. Create Blob and Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.title || 'data'}-extract.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up
    }
  }
}
