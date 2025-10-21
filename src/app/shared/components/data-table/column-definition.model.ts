// src/app/shared/components/data-table/column-definition.model.ts
export interface ColumnDefinition<T> {
  columnDef: string; // Corresponds to matColumnDef
  header: string; // Text for the header cell
  cell: (element: T) => any; // Function to get the cell value
  isSortable?: boolean; // Whether the column should have sorting enabled
}
