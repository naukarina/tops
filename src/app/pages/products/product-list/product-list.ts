import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Product } from '../../../models/product.model';
import { ProductService } from '../../../services/product.service';

// Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatIconModule, MatButtonModule],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.scss'],
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);

  products$!: Observable<Product[]>;
  displayedColumns: string[] = ['productCode', 'name', 'actions'];

  ngOnInit(): void {
    this.products$ = this.productService.getProducts();
  }

  onDelete(id: string | undefined): void {
    if (id && confirm('Are you sure you want to delete this product?')) {
      this.productService.deleteProduct(id);
    }
  }
}
