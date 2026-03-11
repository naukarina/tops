import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // <-- NEW

// RxJS
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Shared & Services
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';
import { PricelistService } from '../services/pricelist.service';
import { Pricelist, PricelistProduct } from '../models/pricelist.model';
import { PartnerService } from '../../partners/services/partner.service';
import { ProductService } from '../../products/services/product.service';
import { ItemService } from '../../items/services/item.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Product } from '../../products/models/product.model';
import { Currency, CurrencyName } from '../../../core/models/currency.model';
import { PricelistProductsDialogComponent } from './pricelist-products-dialog/pricelist-products-dialog';

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
    MatDialogModule, // <-- NEW
    EditPageComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './pricelist-edit.html',
  styleUrls: ['./pricelist-edit.scss'],
})
export class PricelistEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pricelistService = inject(PricelistService);
  private partnerService = inject(PartnerService);
  private productService = inject(ProductService);
  private itemService = inject(ItemService);
  private currencyService = inject(CurrencyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog); // <-- NEW

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

  constructor() {
    this.initForm();
  }

  get periodsArray() {
    return this.pricelistForm.get('periods') as FormArray;
  }

  getProductsArray(periodIndex: number) {
    return this.periodsArray.at(periodIndex).get('pricelistProducts') as FormArray;
  }

  ngOnInit(): void {
    this.pricelistId = this.route.snapshot.paramMap.get('id');

    if (this.pricelistId) {
      this.isEditMode = true;
      this.pricelistService
        .get(this.pricelistId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((pricelist) => {
          if (pricelist) this.patchForm(pricelist);
        });
    } else {
      this.addPeriod();
    }

    this.itemService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => (this.allItems = items));

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
      currencyName: [CurrencyName.EUR, Validators.required],
      tourOperatorIds: [[]],
      periods: this.fb.array([]),
    });
  }

  addPeriod() {
    const periodGroup = this.fb.group({
      validityFrom: [new Date(), Validators.required],
      validityTo: [new Date(), Validators.required],
      pricelistProducts: this.fb.array([]),
    });
    this.periodsArray.push(periodGroup);
  }

  removePeriod(periodIndex: number) {
    this.periodsArray.removeAt(periodIndex);
  }

  // --- DIALOG INTEGRATION ---
  openProductsDialog(periodIndex: number) {
    const currentProducts = this.getProductsArray(periodIndex).value;
    const currencyName = this.pricelistForm.get('currencyName')?.value;

    const dialogRef = this.dialog.open(PricelistProductsDialogComponent, {
      width: '90vw', // Wide dialog for the table
      maxWidth: '1200px',
      disableClose: true, // Prevent accidental closes
      data: {
        products: currentProducts,
        currencyName: currencyName,
        allProducts: this.allProducts,
        allItems: this.allItems,
        allCurrencies: this.allCurrencies,
      },
    });

    dialogRef.afterClosed().subscribe((result: PricelistProduct[]) => {
      if (result) {
        const productsArray = this.getProductsArray(periodIndex);
        productsArray.clear(); // Clear old FormArray

        // Rebuild FormArray with new data
        result.forEach((p) => {
          productsArray.push(
            this.fb.group({
              baseProductId: [p.baseProductId, Validators.required],
              displayName: [p.displayName, Validators.required],
              price: [p.price, Validators.required],
            }),
          );
        });

        this.pricelistForm.markAsDirty();
      }
    });
  }

  patchForm(pricelist: any) {
    this.pricelistForm.patchValue({
      name: pricelist.name,
      currencyName: pricelist.currencyName,
      tourOperatorIds: pricelist.tourOperatorIds || [],
    });

    this.periodsArray.clear();
    const periodsToLoad = pricelist.periods || [];

    periodsToLoad.forEach((period: any) => {
      const periodGroup = this.fb.group({
        validityFrom: [
          period.validityFrom?.toDate
            ? period.validityFrom.toDate()
            : new Date(period.validityFrom),
          Validators.required,
        ],
        validityTo: [
          period.validityTo?.toDate ? period.validityTo.toDate() : new Date(period.validityTo),
          Validators.required,
        ],
        pricelistProducts: this.fb.array([]),
      });

      if (period.pricelistProducts) {
        const productsArray = periodGroup.get('pricelistProducts') as FormArray;
        period.pricelistProducts.forEach((p: any) => {
          productsArray.push(
            this.fb.group({
              baseProductId: [p.baseProductId, Validators.required],
              displayName: [p.displayName, Validators.required],
              price: [p.price, Validators.required],
            }),
          );
        });
      }
      this.periodsArray.push(periodGroup);
    });
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
}
