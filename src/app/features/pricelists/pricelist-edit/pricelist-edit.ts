import { Component, OnInit } from '@angular/core';
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
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';
import { PricelistService } from '../services/pricelist.service';
import { Pricelist } from '../models/pricelist.model';
import { PartnerService } from '../../partners/services/partner.service';
import { ProductService } from '../../products/services/product.service';

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
  ],
  templateUrl: './pricelist-edit.html',
  styleUrls: ['./pricelist-edit.scss'],
})
export class PricelistEditComponent implements OnInit {
  pricelistForm!: FormGroup;
  isEditMode = false;
  pricelistId: string | null = null;

  // Data Observables
  tourOperators$: Observable<any[]>;
  products$: Observable<any[]>;

  // Local Data for the Linked List View
  private allTourOperators: any[] = [];

  constructor(
    private fb: FormBuilder,
    private pricelistService: PricelistService,
    private partnerService: PartnerService,
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.initForm();

    // Initialize observables and capture partners locally to resolve selected names
    this.tourOperators$ = this.partnerService
      .getAll()
      .pipe(tap((partners) => (this.allTourOperators = partners)));
    this.products$ = this.productService.getAll();
  }

  get productsArray() {
    return this.pricelistForm.get('pricelistProducts') as FormArray;
  }

  ngOnInit(): void {
    this.pricelistId = this.route.snapshot.paramMap.get('id');

    if (this.pricelistId) {
      this.isEditMode = true;
      this.pricelistService.get(this.pricelistId).subscribe((pricelist) => {
        if (pricelist) {
          this.patchForm(pricelist);
        }
      });
    }
  }

  initForm() {
    this.pricelistForm = this.fb.group({
      name: ['', Validators.required],
      validityFrom: [new Date(), Validators.required],
      validityTo: [new Date(), Validators.required],
      currencyName: ['EUR', Validators.required],
      tourOperatorIds: [[]], // Array of linked tour operator IDs
      pricelistProducts: this.fb.array([]),
    });
  }

  addProduct() {
    const productGroup = this.fb.group({
      baseProductId: ['', Validators.required],
      displayName: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
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
        this.productsArray.push(group);
      });
    }
  }
  onSubmit() {
    if (this.pricelistForm.invalid) return;

    // Just get the form values without forcing an undefined ID
    const pricelistData: any = {
      ...this.pricelistForm.value,
    };

    if (this.isEditMode && this.pricelistId) {
      // Pass the ID to the update method, but it doesn't need to be in the body
      this.pricelistService.update(this.pricelistId, pricelistData).then(() => {
        this.router.navigate(['/pricelists']);
      });
    } else {
      this.pricelistService.add(pricelistData).then(() => {
        this.router.navigate(['/pricelists']);
      });
    }
  }

  // --- Linked Tour Operators Logic ---
  getSelectedTourOperators(): any[] {
    const selectedIds = this.pricelistForm.get('tourOperatorIds')?.value || [];
    return this.allTourOperators.filter((to) => selectedIds.includes(to.id));
  }

  removeLinkedTourOperator(idToRemove: string) {
    const currentIds = this.pricelistForm.get('tourOperatorIds')?.value || [];
    const updatedIds = currentIds.filter((id: string) => id !== idToRemove);
    this.pricelistForm.get('tourOperatorIds')?.setValue(updatedIds);
  }
}
