// src/app/pages/partners/partner-edit/partner-edit.ts
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { of, ReplaySubject, Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { CurrencyName } from '../../../models/currency.model';
import { countryList, Region } from '../../../models/location.model';

// Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

// Shared Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { UserProfileService } from '../../../services/user-profile.service';
import { CompanyService } from '../../../services/company.service';

export interface PartnerForm {
  name: FormControl<string>;
  type: FormControl<PartnerType | null>;
  isActive: FormControl<boolean>;
  contactInfo: FormGroup<{
    email: FormControl<string>;
    tel: FormControl<string | null>;
    tel2: FormControl<string | null>;
    address: FormControl<string | null>;
    zip: FormControl<string | null>;
    town: FormControl<string | null>;
    country: FormControl<string | null>;
  }>;
  taxinfo: FormGroup<{
    brn: FormControl<string | null>;
    isVatRegistered: FormControl<boolean>;
    vatNumber: FormControl<string | null>;
  }>;
  currencyName: FormControl<CurrencyName | null>;
  remarks: FormControl<string | null>;
  hotelInfo?: FormGroup<{
    starRating: FormControl<number | null>;
    region: FormControl<Region | null>;
  }>;
  subDmc: FormControl<string | null>;
}

@Component({
  selector: 'app-partners-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    EditPageComponent,
    MatSelectModule,
    MatSlideToggleModule,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './partner-edit.html',
})
export class PartnerEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private partnerService = inject(PartnerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  partnerForm!: FormGroup<PartnerForm>;
  isEditMode = false;
  partnerTypes = Object.values(PartnerType);
  currencies = Object.values(CurrencyName);
  countries = countryList;
  regions = Object.values(Region);
  starRatings = [1, 2, 3, 4, 5];
  private partnerId: string | null = null;

  public countryFilterCtrl: FormControl<string | null> = new FormControl<string | null>('');
  public filteredCountries: ReplaySubject<string[]> = new ReplaySubject<string[]>(1);
  private _onDestroy = new Subject<void>();

  private userProfileService = inject(UserProfileService);
  private companyService = inject(CompanyService);
  subDmcs: string[] = [];

  async ngOnInit(): Promise<void> {
    this.partnerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.partnerId;

    this.partnerForm = this.fb.group({
      name: this.fb.control('', { nonNullable: true, validators: Validators.required }),
      type: this.fb.control<PartnerType | null>(null, Validators.required),
      isActive: this.fb.control(true, { nonNullable: true }),
      contactInfo: this.fb.group({
        email: this.fb.control('', {
          nonNullable: true,
          validators: [Validators.required, Validators.email],
        }),
        tel: this.fb.control(''),
        tel2: this.fb.control(''),
        address: this.fb.control(''),
        zip: this.fb.control(''),
        town: this.fb.control(''),
        country: this.fb.control<string | null>(null),
      }),
      taxinfo: this.fb.group({
        brn: this.fb.control(''),
        isVatRegistered: this.fb.control(false, { nonNullable: true }),
        vatNumber: this.fb.control(''),
      }),
      currencyName: this.fb.control<CurrencyName | null>(null, Validators.required),
      remarks: this.fb.control(''),
      subDmc: this.fb.control(''),
    });

    this.partnerForm.controls.type.valueChanges.subscribe((type) => {
      if (type === PartnerType.HOTEL) {
        this.addHotelInfo();
      } else {
        this.removeHotelInfo();
      }
    });

    this.filteredCountries.next(this.countries.slice());
    this.countryFilterCtrl.valueChanges.pipe(takeUntil(this._onDestroy)).subscribe(() => {
      this.filterCountries();
    });

    // Fetch sub-DMCs from the current user's company
    this.userProfileService.currentUserProfile$
      .pipe(
        tap((userProfile) => {
          console.log('Fetched user profile:', userProfile);
        }),
        switchMap((userProfile) => {
          if (userProfile && userProfile.companyId) {
            return this.companyService.get(userProfile.companyId);
          }
          return of(null);
        })
      )
      .subscribe((company) => {
        console.log('Fetched company for user:', company);

        if (company && company.subDmcs) {
          this.subDmcs = company.subDmcs;
        }
      });

    if (this.isEditMode && this.partnerId) {
      const partnerDoc = await this.partnerService.get(this.partnerId);
      if (partnerDoc.exists()) {
        const partnerData = partnerDoc.data() as Partner;
        this.partnerForm.patchValue(partnerData);

        if (partnerData.type === PartnerType.HOTEL && partnerData.hotelInfo) {
          this.addHotelInfo();
          this.partnerForm.controls.hotelInfo?.patchValue(partnerData.hotelInfo);
        }
      } else {
        console.error('Partner not found!');
        this.router.navigate(['/partners']);
      }
    }
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  addHotelInfo() {
    if (this.partnerForm.controls.hotelInfo) return;
    this.partnerForm.addControl(
      'hotelInfo',
      this.fb.group({
        starRating: this.fb.control<number | null>(null),
        region: this.fb.control<Region | null>(null),
      })
    );
  }

  removeHotelInfo() {
    this.partnerForm.removeControl('hotelInfo');
  }

  private filterCountries() {
    let search = this.countryFilterCtrl.value;
    if (!search) {
      this.filteredCountries.next(this.countries.slice());
      return;
    }
    search = search.toLowerCase();
    this.filteredCountries.next(
      this.countries.filter((country) => country.toLowerCase().includes(search!))
    );
  }

  async onSubmit(): Promise<void> {
    if (this.partnerForm.invalid) {
      return;
    }

    const partnerData = this.partnerForm.getRawValue() as Partner;

    if (this.isEditMode && this.partnerId) {
      await this.partnerService.update(this.partnerId, partnerData);
    } else {
      await this.partnerService.add(partnerData);
    }
    this.router.navigate(['/partners']);
  }
}
