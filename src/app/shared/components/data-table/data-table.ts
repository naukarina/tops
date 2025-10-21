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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button'; // Import MatButtonModule
import { MatCheckboxModule } from '@angular/material/checkbox'; // Import MatCheckboxModule
import { Observable, Subscription, isObservable } from 'rxjs';
import { ColumnDefinition } from './column-definition.model';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // Add RouterModule
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule, // Add MatButtonModule
    MatCheckboxModule, // Add MatCheckboxModule
    MatSortModule,
    MatSort,
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
})
export class DataTableComponent<T> implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  // --- Inputs ---
  @Input() dataInput: Observable<T[]> | T[] = []; // Accept Observable or Array
  @Input() columnDefinitions: ColumnDefinition<T>[] = [];
  @Input() displayedColumns: string[] = [];
  @Input() enableFilter = true;
  @Input() enableSort = true;
  @Input() enablePaginator = true;
  @Input() pageSizeOptions = [5, 10, 20];
  @Input() filterPlaceholder = 'Search...';
  // Specific Inputs for Actions Column (Example)
  @Input() viewRoute?: (item: T) => string | any[];
  @Input() editRoute?: (item: T) => string | any[];
  @Input() enableDelete = false;

  // --- Outputs ---
  @Output() deleteAction = new EventEmitter<T>(); // Example delete output

  // --- Internal Properties ---
  dataSource = new MatTableDataSource<T>();
  private dataSubscription: Subscription | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInput']) {
      this.subscribeToData();
    }
    // Could add checks for columnDefinitions or displayedColumns if they might change
  }

  ngOnInit() {
    // Initial subscription
    this.subscribeToData();
  }

  ngAfterViewInit() {
    this.setupDataSource();
  }

  ngOnDestroy() {
    this.dataSubscription?.unsubscribe();
  }

  private subscribeToData(): void {
    this.dataSubscription?.unsubscribe(); // Unsubscribe from previous if exists

    if (isObservable(this.dataInput)) {
      this.dataSubscription = this.dataInput.subscribe((data) => {
        this.dataSource.data = data || []; // Handle null/undefined data
        // Re-apply sort/pagination if dataSource is already initialized
        if (this.dataSource.sort) this.dataSource.sort = this.sort;
        if (this.dataSource.paginator) this.dataSource.paginator = this.paginator;
      });
    } else {
      // Handle static array input
      this.dataSource.data = this.dataInput || [];
      this.setupDataSource(); // Ensure setup happens for static data too
    }
  }

  private setupDataSource(): void {
    // These might be called before ViewChild elements are ready if data comes async
    // ngAfterViewInit ensures they are set once available
    if (this.enableSort && this.sort) {
      this.dataSource.sort = this.sort;
    }
    if (this.enablePaginator && this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // --- Action Handlers ---
  onDeleteClick(item: T) {
    this.deleteAction.emit(item);
  }

  // Helper to check if actions column should be displayed
  get showActionsColumn(): boolean {
    return (
      this.displayedColumns.includes('actions') &&
      (!!this.viewRoute || !!this.editRoute || this.enableDelete)
    );
  }
}
