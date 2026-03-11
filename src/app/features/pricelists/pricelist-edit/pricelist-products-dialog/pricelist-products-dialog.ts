import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select';
import { PricelistProduct } from '../../models/pricelist.model';
import { Product } from '../../../products/models/product.model';
import { Currency, CurrencyName } from '../../../../core/models/currency.model';

export interface PricelistProductsDialogData {
  products: PricelistProduct[];
  currencyName: string;
  allProducts: Product[];
  allItems: any[];
  allCurrencies: Currency[];
}

@Component({
  selector: 'app-pricelist-products-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    SearchableSelectComponent,
  ],
  templateUrl: './pricelist-products-dialog.html',
  styleUrls: ['./pricelist-products-dialog.scss'],
})
export class PricelistProductsDialogComponent implements OnInit {
  private fb = inject(FormBuilder);

  form!: FormGroup;
  showCostAnalysis = false;

  constructor(
    public dialogRef: MatDialogRef<PricelistProductsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PricelistProductsDialogData,
  ) {}

  get productsArray() {
    return this.form.get('products') as FormArray;
  }

  ngOnInit() {
    this.form = this.fb.group({
      products: this.fb.array([]),
    });

    // Populate existing products if any
    if (this.data.products && this.data.products.length > 0) {
      this.data.products.forEach((p) => {
        const group = this.fb.group({
          baseProductId: [p.baseProductId, Validators.required],
          displayName: [p.displayName, Validators.required],
          price: [p.price, [Validators.required, Validators.min(0)]],
        });
        this.setupProductListener(group);
        this.productsArray.push(group);
      });
    }
  }

  private setupProductListener(productGroup: FormGroup) {
    productGroup.get('baseProductId')?.valueChanges.subscribe((productId) => {
      const orig = this.getOriginalProductDetails(productId ?? '');
      if (orig) {
        productGroup.patchValue(
          { displayName: orig.name, price: this.convertMurToSelectedCurrency(orig.price) },
          { emitEvent: false },
        );
      }
    });
  }

  addProduct() {
    const group = this.fb.group({
      baseProductId: ['', Validators.required],
      displayName: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
    });
    this.setupProductListener(group);
    this.productsArray.insert(0, group); // Insert at top for better UX
  }

  removeProduct(index: number) {
    this.productsArray.removeAt(index);
  }

  onSave() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.products);
    }
  }

  // --- CSV Logic ---
  onCsvImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      this.processCsvData(e.target?.result as string);
      input.value = '';
    };
    reader.readAsText(file);
  }

  private processCsvData(csvText: string) {
    const lines = csvText.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 2) return alert('CSV file is empty or missing data rows.');

    const headers = this.parseCsvRow(lines[0]);
    const idIdx = headers.findIndex((h) => h.toLowerCase() === 'productid');
    const priceIdx = headers.findIndex((h) => h.toLowerCase() === 'price');
    const nameIdx = headers.findIndex(
      (h) => h.toLowerCase() === 'displayname' || h.toLowerCase() === 'product',
    );

    if (idIdx === -1 || priceIdx === -1)
      return alert('CSV must contain "productId" and "price" columns.');

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvRow(lines[i]);
      if (values.length <= Math.max(idIdx, priceIdx)) continue;

      const productId = values[idIdx];
      const price = parseFloat(values[priceIdx]);
      let displayName = nameIdx !== -1 ? values[nameIdx] : '';

      if (!productId || isNaN(price)) continue;

      if (!displayName) {
        const matchedProduct = this.data.allProducts.find((p) => p.id === productId);
        displayName = matchedProduct ? matchedProduct.name : 'Imported Product';
      }

      const productGroup = this.fb.group({
        baseProductId: [productId, Validators.required],
        displayName: [displayName, Validators.required],
        price: [price, [Validators.required, Validators.min(0)]],
      });

      this.setupProductListener(productGroup);
      this.productsArray.push(productGroup);
    }
  }

  private parseCsvRow(row: string): string[] {
    const result = [];
    let insideQuote = false;
    let currentVal = '';
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') insideQuote = !insideQuote;
      else if (char === ',' && !insideQuote) {
        result.push(currentVal.trim());
        currentVal = '';
      } else currentVal += char;
    }
    result.push(currentVal.trim());
    return result.map((val) => val.replace(/^"|"$/g, ''));
  }

  // --- Calculation Logic ---
  getOriginalProductDetails(productId: string) {
    if (!productId) return null;
    const product = this.data.allProducts.find((p) => p.id === productId);
    if (!product) return null;

    const price = product.validities?.length
      ? product.validities[product.validities.length - 1].price
      : 0;
    let itemsCost = 0;
    (product.itemIds || []).forEach((itemId) => {
      const item = this.data.allItems.find((i) => i.id === itemId);
      if (item && item.validities?.length)
        itemsCost += item.validities[item.validities.length - 1].cost;
    });

    const totalCommissions =
      price *
      (((product.salesRepCommission || 0) +
        (product.toCommission || 0) +
        (product.creditCardCommission || 0)) /
        100);
    const totalCost = itemsCost + totalCommissions;

    return { name: product.name, price, totalCost, netProfit: price - totalCost };
  }

  convertMurToSelectedCurrency(murAmount: number): number {
    const targetCurrencyName = this.data.currencyName;
    if (!targetCurrencyName || targetCurrencyName === CurrencyName.MUR) return murAmount;
    const currencyObj = this.data.allCurrencies.find((c) => c.name === targetCurrencyName);
    if (currencyObj && currencyObj.exchangeRate)
      return Number((murAmount / currencyObj.exchangeRate).toFixed(2));
    return murAmount;
  }

  getPricelistNetProfit(formPrice: number, originalMurCost: number): number {
    return formPrice - this.convertMurToSelectedCurrency(originalMurCost);
  }
}
