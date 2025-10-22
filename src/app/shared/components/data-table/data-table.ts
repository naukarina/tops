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
import { takeUntil, startWith, filter as rxFilter } from 'rxjs/operators';
import { ColumnDefinition } from './column-definition.model';
import { FilterDialogComponent, FilterDialogData } from '../filter-dialog/filter-dialog';
import { MatBadgeModule } from '@angular/material/badge';

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
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
})
export class DataTableComponent<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

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
    this.setupFilterForm();
    this.subscribeToData();
    this.subscribeToFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInput'] && !changes['dataInput'].firstChange) {
      this.subscribeToData();
    }
    if (changes['dropdownFilters'] && !changes['dropdownFilters'].firstChange) {
      this.setupFilterForm();
    }
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
      this.dataSource.data = data || [];
      this.applyCurrentFilters();
      this.setupDataSource();
    };

    if (isObservable(this.dataInput)) {
      this.dataSubscription = this.dataInput
        .pipe(takeUntil(this._onDestroy))
        .subscribe(processData);
    } else {
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
    return path
      .split('.')
      .reduce((o, key) => (o && o[key] !== undefined && o[key] !== null ? o[key] : null), obj);
  }

  private setupDataSource(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
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
}
