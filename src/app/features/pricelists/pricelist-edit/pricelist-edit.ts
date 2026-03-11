import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable, combineLatest } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';
import { PricelistService } from '../services/pricelist.service';
import { Pricelist } from '../models/pricelist.model';
import { PartnerService } from '../../partners/services/partner.service';
import { ProductService } from '../../products/services/product.service';
import { ItemService } from '../../items/services/item.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Product } from '../../products/models/product.model';
import { Currency, CurrencyName } from '../../../core/models/currency.model';

@Component({
  selector: 'app-pricelist-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    EditPageComponent,
    SearchableSelectComponent,
    MatSlideToggleModule,
  ],
  templateUrl: './pricelist-edit.html',
  styleUrls: ['./pricelist-edit.scss'],
})
export class PricelistEditComponent implements OnInit {
  pricelistForm!: FormGroup;
  isEditMode = false;
  pricelistId: string | null = null;

  tourOperators$!: Observable<any[]>;
  products$!: Observable<any[]>;
  currencies$!: Observable<Currency[]>;

  private allTourOperators: any[] = [];
  private allProducts: Product[] = [];
  private allItems: any[] = [];
  private allCurrencies: Currency[] = [];

  currencyNames = Object.values(CurrencyName);
  showCostAnalysis = false;

  destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private pricelistService: PricelistService,
    private partnerService: PartnerService,
    private productService: ProductService,
    private itemService: ItemService,
    private currencyService: CurrencyService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.initForm();
  }

  get productsArray() {
    return this.pricelistForm.get('pricelistProducts') as FormArray;
  }

  ngOnInit(): void {
    this.pricelistId = this.route.snapshot.paramMap.get('id');

    if (this.pricelistId) {
      this.isEditMode = true;
      this.pricelistService.get(this.pricelistId).subscribe((pricelist) => {
        if (pricelist) this.patchForm(pricelist);
      });
    }

    this.itemService.getAll().subscribe((items) => (this.allItems = items));

    this.tourOperators$ = this.partnerService.getAll().pipe(
      tap((tos) => {
        this.allTourOperators = tos;
      }),
      shareReplay(1),
    );

    this.products$ = this.productService.getAll().pipe(
      tap((prods) => {
        this.allProducts = prods;
      }),
      shareReplay(1),
    );

    this.currencies$ = this.currencyService.getAll().pipe(
      tap((currs) => {
        this.allCurrencies = currs;
      }),
      shareReplay(1),
    );

    this.tourOperators$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.products$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.currencies$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  initForm() {
    this.pricelistForm = this.fb.group({
      name: ['', Validators.required],
      validityFrom: [new Date(), Validators.required],
      validityTo: [new Date(), Validators.required],
      currencyName: [CurrencyName.EUR, Validators.required], // Dropdown for currencies
      tourOperatorIds: [[]],
      pricelistProducts: this.fb.array([]),
    });
  }

  addProduct() {
    const productGroup = this.fb.group({
      baseProductId: ['', Validators.required],
      displayName: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });

    // AUTO-FILL LOGIC: Listen to product selection to set default name & converted price
    productGroup.get('baseProductId')?.valueChanges.subscribe((productId) => {
      const orig = this.getOriginalProductDetails(productId ?? '');
      if (orig) {
        productGroup.patchValue(
          {
            displayName: orig.name,
            price: this.convertMurToSelectedCurrency(orig.price),
          },
          { emitEvent: false },
        ); // prevent infinite loops
      }
    });
    this.productsArray.push(productGroup);
  }

  removeProduct(index: number) {
    this.productsArray.removeAt(index);
  }

  patchForm(pricelist: Pricelist) {
    this.pricelistForm.patchValue({
      name: pricelist.name,
      validityFrom: pricelist.validityFrom?.toDate
        ? pricelist.validityFrom.toDate()
        : new Date(pricelist.validityFrom),
      validityTo: pricelist.validityTo?.toDate
        ? pricelist.validityTo.toDate()
        : new Date(pricelist.validityTo),
      currencyName: pricelist.currencyName,
      tourOperatorIds: pricelist.tourOperatorIds || [],
    });

    this.productsArray.clear();

    if (pricelist.pricelistProducts) {
      pricelist.pricelistProducts.forEach((p) => {
        const group = this.fb.group({
          baseProductId: [p.baseProductId, Validators.required],
          displayName: [p.displayName, Validators.required],
          price: [p.price, Validators.required],
        });

        // Add listener AFTER patching so we don't overwrite existing db values on load
        group.get('baseProductId')?.valueChanges.subscribe((productId) => {
          const orig = this.getOriginalProductDetails(productId ?? '');
          if (orig) {
            group.patchValue(
              { displayName: orig.name, price: this.convertMurToSelectedCurrency(orig.price) },
              { emitEvent: false },
            );
          }
        });

        this.productsArray.push(group);
      });
    }
  }

  onSubmit() {
    if (this.pricelistForm.invalid) return;

    const pricelistData: any = { ...this.pricelistForm.value };

    if (this.isEditMode && this.pricelistId) {
      this.pricelistService
        .update(this.pricelistId, pricelistData)
        .then(() => this.router.navigate(['/pricelists']));
    } else {
      this.pricelistService.add(pricelistData).then(() => this.router.navigate(['/pricelists']));
    }
  }

  // --- CALCULATION & CONVERSION LOGIC ---

  getOriginalProductDetails(productId: string) {
    if (!productId) return null;

    const product = this.allProducts.find((p) => p.id === productId);
    if (!product) return null;

    // 1. Get original price (from latest validity)
    const price = product.validities?.length
      ? product.validities[product.validities.length - 1].price
      : 0;

    // 2. Get original items cost
    let itemsCost = 0;
    (product.itemIds || []).forEach((itemId) => {
      const item = this.allItems.find((i) => i.id === itemId);
      if (item && item.validities?.length) {
        itemsCost += item.validities[item.validities.length - 1].cost;
      }
    });

    // 3. Commissions & Total Cost
    const totalCommissions =
      price *
      (((product.salesRepCommission || 0) +
        (product.toCommission || 0) +
        (product.creditCardCommission || 0)) /
        100);
    const totalCost = itemsCost + totalCommissions;

    return {
      name: product.name,
      price: price,
      totalCost: totalCost,
      netProfit: price - totalCost,
    };
  }

  convertMurToSelectedCurrency(murAmount: number): number {
    const targetCurrencyName = this.pricelistForm.get('currencyName')?.value;
    if (!targetCurrencyName || targetCurrencyName === CurrencyName.MUR) return murAmount;

    const currencyObj = this.allCurrencies.find((c) => c.name === targetCurrencyName);
    if (currencyObj && currencyObj.exchangeRate) {
      return Number((murAmount / currencyObj.exchangeRate).toFixed(2));
    }

    return murAmount;
  }

  getPricelistNetProfit(formPrice: number, originalMurCost: number): number {
    const convertedCost = this.convertMurToSelectedCurrency(originalMurCost);
    return formPrice - convertedCost;
  }

  // --- Linked Tour Operators Logic ---

  getSelectedTourOperators(): any[] {
    const selectedIds = this.pricelistForm.get('tourOperatorIds')?.value || [];
    return this.allTourOperators.filter((to) => selectedIds.includes(to.id));
  }

  removeLinkedTourOperator(idToRemove: string) {
    const currentIds = this.pricelistForm.get('tourOperatorIds')?.value || [];
    this.pricelistForm
      .get('tourOperatorIds')
      ?.setValue(currentIds.filter((id: string) => id !== idToRemove));
  }

  onCsvImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.processCsvData(text);
      // Reset input so the same file can be uploaded again if needed
      input.value = '';
    };

    reader.readAsText(file);
  }

  private processCsvData(csvText: string) {
    const lines = csvText.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      alert('CSV file is empty or missing data rows.');
      return;
    }

    const headers = this.parseCsvRow(lines[0]);
    // Look for exact column names (case-insensitive)
    const idIdx = headers.findIndex((h) => h.toLowerCase() === 'productid');
    const priceIdx = headers.findIndex((h) => h.toLowerCase() === 'price');
    const nameIdx = headers.findIndex(
      (h) => h.toLowerCase() === 'displayname' || h.toLowerCase() === 'product',
    );

    if (idIdx === -1 || priceIdx === -1) {
      alert('CSV must contain "productId" and "price" columns.');
      return;
    }

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvRow(lines[i]);
      if (values.length <= Math.max(idIdx, priceIdx)) continue; // Skip malformed rows

      const productId = values[idIdx];
      const price = parseFloat(values[priceIdx]);
      let displayName = nameIdx !== -1 ? values[nameIdx] : '';

      // Skip if essential data is missing
      if (!productId || isNaN(price)) continue;

      // Fallback: if name is missing in CSV, try to find it in loaded products
      if (!displayName) {
        const matchedProduct = this.allProducts.find((p) => p.id === productId);
        displayName = matchedProduct ? matchedProduct.name : 'Imported Product';
      }

      // Create the FormGroup without triggering the auto-fill overwrite
      const productGroup = this.fb.group({
        baseProductId: [productId, Validators.required],
        displayName: [displayName, Validators.required],
        price: [price, [Validators.required, Validators.min(0)]],
      });

      // Attach the listener so manual edits later still work
      this.setupProductListener(productGroup);

      this.productsArray.push(productGroup);
    }
  }
  private setupProductListener(productGroup: FormGroup) {
    productGroup.get('baseProductId')?.valueChanges.subscribe((productId) => {
      const orig = this.getOriginalProductDetails(productId ?? '');
      if (orig) {
        productGroup.patchValue(
          {
            displayName: orig.name,
            price: this.convertMurToSelectedCurrency(orig.price),
          },
          { emitEvent: false }, // emitEvent: false prevents infinite loops
        );
      }
    });
  }

  // A robust row parser that handles commas inside quote marks properly
  private parseCsvRow(row: string): string[] {
    const result = [];
    let insideQuote = false;
    let currentVal = '';
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        result.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    result.push(currentVal.trim());
    return result.map((val) => val.replace(/^"|"$/g, '')); // Strip surrounding quotes
  }
}
