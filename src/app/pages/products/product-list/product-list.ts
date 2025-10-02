import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../models/product.model';
import { ProductService } from '../../../services/product.service';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

// Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    ListPageComponent,
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.scss'],
})
export class ProductListComponent {
  private productService = inject(ProductService);
  products$: Observable<Product[]> = this.productService.getProducts();
  displayedColumns = ['select', 'productCode', 'name', 'actions'];
}
