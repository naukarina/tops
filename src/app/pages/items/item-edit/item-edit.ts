import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, firstValueFrom, map, Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

import { ItemService } from '../../../services/item.service';
import { PartnerService } from '../../../services/partner.service';
import { VehicleCategoryService } from '../../../services/vehicle-category.service'; // Import Service
import { NotificationService } from '../../../services/notification.service';
import { Item, ItemCategory, UnitType } from '../../../models/item.model';
import { Partner, PartnerType } from '../../../models/partner.model';
import { VehicleCategory } from '../../../models/vehicle-category.model'; // Import Model

import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';

// Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-item-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
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
    MatSlideToggleModule,
  ],
  templateUrl: './item-edit.html',
  styleUrls: ['./item-edit.scss'],
})
export class ItemEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private itemService = inject(ItemService);
  private partnerService = inject(PartnerService);
  private vehicleCategoryService = inject(VehicleCategoryService); // Inject
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form!: FormGroup;
  isEditMode = false;
  itemId: string | null = null;

  categories = Object.values(ItemCategory);
  unitTypes = Object.values(UnitType);

  partners$: Observable<Partner[]> = this.partnerService
    .getAll()
    .pipe(
      map((partners) =>
        partners
          .filter((p) => p.type === PartnerType.SUPPLIER)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );

  // Load vehicle categories
  vehicleCategories$: Observable<VehicleCategory[]> = this.vehicleCategoryService
    .getAll()
    .pipe(map((cats) => cats.sort((a, b) => a.name.localeCompare(b.name))));

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.itemId;

    this.form = this.fb.group({
      name: ['', Validators.required],
      itemCategory: [null, Validators.required],
      unitType: [null, Validators.required],
      partnerId: [null, Validators.required],
      partnerName: [''],
      virtual: [false],
      vehicleCategoryId: [null],
      vehicleCategoryName: [''],

      validities: this.fb.array([]),
    });

    // Auto-populate partnerName
    this.form.get('partnerId')?.valueChanges.subscribe(async (id) => {
      if (id) {
        const partners = await firstValueFrom(this.partners$);
        const partner = partners.find((p) => p.id === id);
        if (partner) {
          this.form.get('partnerName')?.setValue(partner.name);
        }
      }
    });

    // Auto-populate vehicleCategoryName
    this.form.get('vehicleCategoryId')?.valueChanges.subscribe(async (id) => {
      if (id) {
        const categories = await firstValueFrom(this.vehicleCategories$);
        const category = categories.find((c) => c.id === id);
        if (category) {
          this.form.get('vehicleCategoryName')?.setValue(category.name);
        }
      } else {
        this.form.get('vehicleCategoryName')?.setValue(null);
      }
    });

    if (this.isEditMode && this.itemId) {
      this.loadItem();
    } else {
      this.addValidity();
    }
  }

  get validitiesArray() {
    return this.form.get('validities') as FormArray;
  }

  addValidity() {
    const group = this.fb.group({
      from: [null, Validators.required],
      to: [null, Validators.required],
      cost: [0, [Validators.required, Validators.min(0)]],
    });
    this.validitiesArray.push(group);
  }

  removeValidity(index: number) {
    this.validitiesArray.removeAt(index);
  }

  async loadItem() {
    if (!this.itemId) return;
    const item = await firstValueFrom(this.itemService.get(this.itemId));
    if (item) {
      this.form.patchValue({
        name: item.name,
        itemCategory: item.itemCategory,
        virtual: item.virtual || false,
        unitType: item.unitType,
        partnerId: item.partnerId,
        partnerName: item.partnerName,
        vehicleCategoryId: item.vehicleCategoryId, // Patch ID
        vehicleCategoryName: item.vehicleCategoryName, // Patch Name
      });

      if (item.validities) {
        item.validities.forEach((v) => {
          this.validitiesArray.push(
            this.fb.group({
              from: [v.from.toDate(), Validators.required],
              to: [v.to.toDate(), Validators.required],
              cost: [v.cost, [Validators.required, Validators.min(0)]],
            })
          );
        });
      }
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.notificationService.showError('Please check the form for errors.');
      return;
    }

    const formVal = this.form.getRawValue();

    const validities = formVal.validities.map((v: any) => ({
      from: Timestamp.fromDate(v.from),
      to: Timestamp.fromDate(v.to),
      cost: v.cost,
    }));

    const itemData: Partial<Item> = {
      name: formVal.name,
      itemCategory: formVal.itemCategory,
      virtual: formVal.virtual,
      unitType: formVal.unitType,
      partnerId: formVal.partnerId,
      partnerName: formVal.partnerName,
      vehicleCategoryId: formVal.vehicleCategoryId, // Save ID
      vehicleCategoryName: formVal.vehicleCategoryName, // Save Name
      validities: validities,
    };

    try {
      if (this.isEditMode && this.itemId) {
        await this.itemService.update(this.itemId, itemData);
        this.notificationService.showSuccess('Item updated successfully.');
      } else {
        await this.itemService.add(itemData as Item);
        this.notificationService.showSuccess('Item created successfully.');
      }
      this.router.navigate(['/items']);
    } catch (error: any) {
      console.error(error);
      this.notificationService.showError(error.message || 'Error saving item.');
    }
  }
}
