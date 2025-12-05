import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, firstValueFrom, map, Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

import { ProductService } from '../../../services/product.service';
import { PartnerService } from '../../../services/partner.service';
import { VehicleCategoryService } from '../../../services/vehicle-category.service';
import { ItemService } from '../../../services/item.service';
import { NotificationService } from '../../../services/notification.service';

import { Product, ProductValidity } from '../../../models/product.model';
import { Item, ItemCategory, UnitType } from '../../../models/item.model';
import { Partner, PartnerType } from '../../../models/partner.model';
import { VehicleCategory } from '../../../models/vehicle-category.model';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';

// Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    EditPageComponent,
    SearchableSelectComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
  ],
  templateUrl: './product-edit.html',
  styleUrls: ['./product-edit.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private partnerService = inject(PartnerService);
  private vehicleCategoryService = inject(VehicleCategoryService);
  private itemService = inject(ItemService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  productForm!: FormGroup;
  isEditMode = false;
  private productId: string | null = null;

  categories = Object.values(ItemCategory);
  unitTypes = Object.values(UnitType);

  // Load Suppliers
  partners$: Observable<Partner[]> = this.partnerService
    .getAll()
    .pipe(
      map((partners) =>
        partners
          .filter((p) => p.type === PartnerType.SUPPLIER)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );

  // Load Vehicle Categories
  vehicleCategories$: Observable<VehicleCategory[]> = this.vehicleCategoryService
    .getAll()
    .pipe(map((cats) => cats.sort((a, b) => a.name.localeCompare(b.name))));

  // Load Items for selection
  items$: Observable<Item[]> = this.itemService
    .getAll()
    .pipe(map((items) => items.sort((a, b) => a.name.localeCompare(b.name))));

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.productId;

    this.productForm = this.fb.group({
      name: ['', Validators.required],
      productCategory: [null, Validators.required],
      unitType: [null, Validators.required],

      partnerId: [null, Validators.required],
      partnerName: [''],

      vehicleCategoryId: [null],
      vehicleCategoryName: [''],

      itemIds: [[]], // Array of selected Item IDs

      salesRepCommission: [0, [Validators.min(0), Validators.max(100)]],
      toCommission: [0, [Validators.min(0), Validators.max(100)]],
      creditCardCommission: [0, [Validators.min(0), Validators.max(100)]],

      validities: this.fb.array([]),
    });

    // Auto-populate partnerName
    this.productForm.get('partnerId')?.valueChanges.subscribe(async (id) => {
      if (id) {
        const partners = await firstValueFrom(this.partners$);
        const partner = partners.find((p) => p.id === id);
        if (partner) {
          this.productForm.get('partnerName')?.setValue(partner.name);
        }
      }
    });

    // Auto-populate vehicleCategoryName
    this.productForm.get('vehicleCategoryId')?.valueChanges.subscribe(async (id) => {
      if (id) {
        const categories = await firstValueFrom(this.vehicleCategories$);
        const category = categories.find((c) => c.id === id);
        if (category) {
          this.productForm.get('vehicleCategoryName')?.setValue(category.name);
        }
      } else {
        this.productForm.get('vehicleCategoryName')?.setValue(null);
      }
    });

    if (this.isEditMode && this.productId) {
      this.loadProduct();
    } else {
      this.addValidity();
    }
  }

  get validitiesArray() {
    return this.productForm.get('validities') as FormArray;
  }

  addValidity() {
    const group = this.fb.group({
      from: [null, Validators.required],
      to: [null, Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });
    this.validitiesArray.push(group);
  }

  removeValidity(index: number) {
    this.validitiesArray.removeAt(index);
  }

  async loadProduct() {
    if (!this.productId) return;
    const product = await firstValueFrom(this.productService.getProduct(this.productId));

    if (product) {
      this.productForm.patchValue({
        name: product.name,
        productCategory: product.productCategory,
        unitType: product.unitType,
        partnerId: product.partnerId,
        partnerName: product.partnerName,
        vehicleCategoryId: product.vehicleCategoryId,
        vehicleCategoryName: product.vehicleCategoryName,
        itemIds: product.itemIds || [],
        salesRepCommission: product.salesRepCommission || 0,
        toCommission: product.toCommission || 0,
        creditCardCommission: product.creditCardCommission || 0,
      });

      if (product.validities) {
        product.validities.forEach((v) => {
          this.validitiesArray.push(
            this.fb.group({
              from: [v.from.toDate(), Validators.required],
              to: [v.to.toDate(), Validators.required],
              price: [v.price, [Validators.required, Validators.min(0)]],
            })
          );
        });
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.notificationService.showError('Please check the form for errors.');
      return;
    }

    const formVal = this.productForm.getRawValue();

    const validities = formVal.validities.map((v: any) => ({
      from: Timestamp.fromDate(v.from),
      to: Timestamp.fromDate(v.to),
      price: v.price,
    }));

    const productData: Partial<Product> = {
      name: formVal.name,
      productCategory: formVal.productCategory,
      unitType: formVal.unitType,
      partnerId: formVal.partnerId,
      partnerName: formVal.partnerName,
      vehicleCategoryId: formVal.vehicleCategoryId,
      vehicleCategoryName: formVal.vehicleCategoryName,
      itemIds: formVal.itemIds,
      salesRepCommission: formVal.salesRepCommission,
      toCommission: formVal.toCommission,
      creditCardCommission: formVal.creditCardCommission,
      validities: validities,
    };

    try {
      if (this.isEditMode && this.productId) {
        await this.productService.updateProduct(this.productId, productData);
        this.notificationService.showSuccess('Product updated successfully.');
      } else {
        await this.productService.addProduct(productData as Product);
        this.notificationService.showSuccess('Product created successfully.');
      }
      this.router.navigate(['/products']);
    } catch (error: any) {
      console.error(error);
      this.notificationService.showError(error.message || 'Error saving product.');
    }
  }
}
