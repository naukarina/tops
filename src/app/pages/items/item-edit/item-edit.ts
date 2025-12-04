import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, firstValueFrom, Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

import { ItemService } from '../../../services/item.service';
import { PartnerService } from '../../../services/partner.service';
import { NotificationService } from '../../../services/notification.service';
import { Item, ItemCategory, UnitType } from '../../../models/item.model';
import { Partner } from '../../../models/partner.model';

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
  ],
  templateUrl: './item-edit.html',
  styleUrls: ['./item-edit.scss'],
})
export class ItemEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private itemService = inject(ItemService);
  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form!: FormGroup;
  isEditMode = false;
  itemId: string | null = null;

  categories = Object.values(ItemCategory);
  unitTypes = Object.values(UnitType);
  partners$: Observable<Partner[]> = this.partnerService.getAll();

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.itemId;

    this.form = this.fb.group({
      name: ['', Validators.required],
      itemCategory: [null, Validators.required],
      unitType: [null, Validators.required],
      partnerId: [null, Validators.required],
      partnerName: [''], // Hidden, auto-populated
      validities: this.fb.array([]),
    });

    // Auto-populate partnerName when partnerId changes
    this.form.get('partnerId')?.valueChanges.subscribe(async (id) => {
      if (id) {
        const partners = await firstValueFrom(this.partners$);
        const partner = partners.find((p) => p.id === id);
        if (partner) {
          this.form.get('partnerName')?.setValue(partner.name);
        }
      }
    });

    if (this.isEditMode && this.itemId) {
      this.loadItem();
    } else {
      // Add one empty validity row by default for new items
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
      // Patch simple fields
      this.form.patchValue({
        name: item.name,
        itemCategory: item.itemCategory,
        unitType: item.unitType,
        partnerId: item.partnerId,
        partnerName: item.partnerName,
      });

      // Patch validities array
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

    // Convert JS Dates back to Firestore Timestamps
    const validities = formVal.validities.map((v: any) => ({
      from: Timestamp.fromDate(v.from),
      to: Timestamp.fromDate(v.to),
      cost: v.cost,
    }));

    const itemData: Partial<Item> = {
      name: formVal.name,
      itemCategory: formVal.itemCategory,
      unitType: formVal.unitType,
      partnerId: formVal.partnerId,
      partnerName: formVal.partnerName,
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
