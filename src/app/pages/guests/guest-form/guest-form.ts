// src/app/shared/components/guest-form/guest-form.ts
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Partner } from '../../../models/partner.model';
import { GuestForm } from '../../../pages/guests/guest.form.model';

// Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';

// Shared Components
import { CommonModule } from '@angular/common';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select';

@Component({
  selector: 'app-guest-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    SearchableSelectComponent,
  ],
  templateUrl: './guest-form.html',
  styleUrls: ['./guest-form.scss'], // We'll create a blank scss file
})
export class GuestFormComponent implements OnInit, OnDestroy {
  @Input({ required: true }) guestForm!: FormGroup<GuestForm>;
  @Input({ required: true }) hotels$!: Observable<Partner[]>;
  @Input({ required: true }) tourOperators$!: Observable<Partner[]>;

  private _onDestroy = new Subject<void>();

  ngOnInit(): void {
    // --- Logic moved from guest-edit.ts ---

    // Reset custom field if "Custom" is not selected
    this.guestForm.controls.arrivalLocationSelect.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((value) => {
        if (value !== 'Custom') {
          this.guestForm.controls.arrivalLocationCustom.reset();
        }
      });

    this.guestForm.controls.departureLocationSelect.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((value) => {
        if (value !== 'Custom') {
          this.guestForm.controls.departureLocationCustom.reset();
        }
      });

    // Update total Pax when pax numbers change
    this.guestForm.controls.pax.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe((paxValue) => {
        const adult = paxValue.adult || 0;
        const child = paxValue.child || 0;
        const infant = paxValue.infant || 0;
        this.guestForm.controls.pax.controls.total.setValue(adult + child + infant, {
          emitEvent: false,
        });
      });
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
}
