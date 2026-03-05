import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';
import { ProductService } from '../services/product.service';
import { PartnerService } from '../../partners/services/partner.service';
import { Product } from '../models/product.model';
import { ItemService } from '@features/items';
import { VehicleCategoryService } from '@features/vehicle-categories/services/vehicle-category.service';

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatTooltipModule,
    EditPageComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './product-edit.html',
  styleUrls: ['./product-edit.scss'],
})
export class ProductEditComponent implements OnInit {
  productForm!: FormGroup;
  isEditMode = false;
  productId: string | null = null;

  // Data Observables
  partners$: Observable<any[]>;
  items$: Observable<any[]>;
  vehicleCategories$: Observable<any[]>;

  categories = ['Transfer', 'Tour', 'Excursion', 'Package'];
  unitTypes = ['Per Person', 'Per Vehicle', 'Per Group'];

  // --- NEW: Local Data for Calculations ---
  private allItems: any[] = [];
  private allPartners: any[] = [];

  // Assumed Company VAT Rate (This should ideally come from AuthService/CompanyService)
  private companyVatRate = 0.15; // 15%

  // Profitability Object
  profitability = {
    price: 0,
    itemsCost: 0,
    grossProfit: 0,
    priceExcl: 0,
    itemsCostExcl: 0,
    grossProfitExcl: 0,
    salesRepCommVal: 0,
    toCommVal: 0,
    creditCardCommVal: 0,
    totalCost: 0,
    netProfit: 0,
  };

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private partnerService: PartnerService,
    private itemService: ItemService,
    private vehicleCategoryService: VehicleCategoryService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.initForm();

    // Initialize observables
    this.partners$ = this.partnerService
      .getAll()
      .pipe(tap((partners) => (this.allPartners = partners)));
    this.items$ = this.itemService.getAll().pipe(tap((items) => (this.allItems = items)));
    this.vehicleCategories$ = this.vehicleCategoryService.getAll();
  }

  get validitiesArray() {
    return this.productForm.get('validities') as FormArray;
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');

    // Subscribe to form changes to recalculate profitability
    this.productForm.valueChanges.subscribe(() => {
      this.calculateProfitability();
    });

    if (this.productId) {
      this.isEditMode = true;
      this.productService.get(this.productId).subscribe((product) => {
        this.patchForm(product);
      });
    } else {
      this.addValidity(); // Add default validity for new product
    }
  }

  initForm() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      productCategory: ['', Validators.required],
      unitType: ['', Validators.required],
      vehicleCategoryId: [null],
      itemIds: [[]], // Array of linked item IDs
      salesRepCommission: [0, [Validators.min(0), Validators.max(100)]],
      toCommission: [0, [Validators.min(0), Validators.max(100)]],
      creditCardCommission: [0, [Validators.min(0), Validators.max(100)]],
      validities: this.fb.array([]),
    });
  }

  addValidity() {
    const validityGroup = this.fb.group({
      from: [new Date(), Validators.required],
      to: [new Date(), Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });
    this.validitiesArray.push(validityGroup);
  }

  removeValidity(index: number) {
    this.validitiesArray.removeAt(index);
  }

  patchForm(product: Product) {
    this.productForm.patchValue({
      name: product.name,
      productCategory: product.productCategory,
      unitType: product.unitType,
      vehicleCategoryId: product.vehicleCategoryId,
      itemIds: product.itemIds || [],
      salesRepCommission: product.salesRepCommission || 0,
      toCommission: product.toCommission || 0,
      creditCardCommission: product.creditCardCommission || 0,
    });

    this.validitiesArray.clear();
    if (product.validities) {
      product.validities.forEach((v) => {
        const group = this.fb.group({
          from: [v.from instanceof Date ? v.from : v.from.toDate(), Validators.required],
          to: [v.to instanceof Date ? v.to : v.to.toDate(), Validators.required],
          price: [v.price, Validators.required],
        });
        this.validitiesArray.push(group);
      });
    }
  }

  // --- NEW: Calculation Logic ---
  calculateProfitability() {
    const formVal = this.productForm.value;

    // 1. Get Price (Latest Validity)
    const validities = formVal.validities;
    const latestPrice =
      validities && validities.length > 0 ? validities[validities.length - 1].price : 0;
    this.profitability.price = latestPrice || 0;

    // 2. Calculate Items Cost (Incl & Excl VAT)
    let totalItemsCost = 0;
    let totalItemsCostExcl = 0;
    const selectedItemIds = formVal.itemIds || [];

    selectedItemIds.forEach((id: string) => {
      const item = this.allItems.find((i) => i.id === id);
      if (item) {
        // Get last validity cost for the item
        const itemCost =
          item.validities && item.validities.length > 0
            ? item.validities[item.validities.length - 1].cost
            : 0;

        totalItemsCost += itemCost;

        // Check Partner VAT Status
        const partner = this.allPartners.find((p) => p.id === item.partnerId);
        const isVatRegistered = partner?.taxInfo?.isVatRegistered ?? false;

        // If partner is VAT registered, exclude VAT from cost (assuming 15% standard if not specified)
        // Note: Real implementation might use partner specific tax rate
        if (isVatRegistered) {
          totalItemsCostExcl += itemCost / (1 + this.companyVatRate);
        } else {
          totalItemsCostExcl += itemCost;
        }
      }
    });

    this.profitability.itemsCost = totalItemsCost;
    this.profitability.itemsCostExcl = totalItemsCostExcl;

    // 3. Gross Profit (Incl)
    this.profitability.grossProfit = this.profitability.price - this.profitability.itemsCost;

    // 4. Price Excl VAT (Based on User's Company VAT settings)
    this.profitability.priceExcl = this.profitability.price / (1 + this.companyVatRate);

    // 5. Gross Profit (Excl)
    this.profitability.grossProfitExcl =
      this.profitability.priceExcl - this.profitability.itemsCostExcl;

    // 6. Commissions (Calculated on the Selling Price - Incl VAT)
    // Note: Adjust logic if commissions should be on Excl VAT price
    const priceBase = this.profitability.price;

    this.profitability.salesRepCommVal = priceBase * ((formVal.salesRepCommission || 0) / 100);
    this.profitability.toCommVal = priceBase * ((formVal.toCommission || 0) / 100);
    this.profitability.creditCardCommVal = priceBase * ((formVal.creditCardCommission || 0) / 100);

    const totalCommissions =
      this.profitability.salesRepCommVal +
      this.profitability.toCommVal +
      this.profitability.creditCardCommVal;

    // 7. Total Cost & Net Profit
    this.profitability.totalCost = this.profitability.itemsCost + totalCommissions;
    this.profitability.netProfit = this.profitability.price - this.profitability.totalCost;
  }

  onSubmit() {
    if (this.productForm.invalid) return;

    const productData: Product = {
      ...this.productForm.value,
      // Ensure we don't send undefined/nulls for IDs if not selected
      id: this.productId || undefined,
    };

    if (this.isEditMode && this.productId) {
      this.productService.update(this.productId, productData).then(() => {
        this.router.navigate(['/products']);
      });
    } else {
      this.productService.add(productData).then(() => {
        this.router.navigate(['/products']);
      });
    }
  }
}
