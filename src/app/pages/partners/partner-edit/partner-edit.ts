import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, ReplaySubject, Subject, firstValueFrom, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CurrencyName } from '../../../models/currency.model';
import { Region, countryList } from '../../../models/location.model';
import { Partner, PartnerType } from '../../../models/partner.model';
import { PartnerService } from '../../../services/partner.service';
import { UserProfileService } from '../../../services/user-profile.service';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

// Shared Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';
import { CommonModule } from '@angular/common';

// Form Interface and Component Definition...
export interface PartnerForm {
  name: FormControl<string>;
  type: FormControl<PartnerType | null>;
  isActive: FormControl<boolean>;
  subDmc: FormControl<string | null>;
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
  styleUrl: './partner-edit.scss',
})
export class PartnerEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private partnerService = inject(PartnerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userProfileService = inject(UserProfileService);

  partnerForm!: FormGroup<PartnerForm>;
  isEditMode = false;
  partnerTypes = Object.values(PartnerType);
  currencies = Object.values(CurrencyName);
  countries = countryList;
  regions = Object.values(Region);
  starRatings = [1, 2, 3, 4, 5];
  private partnerId: string | null = null;

  subDmcs$!: Observable<string[]>;

  public countryFilterCtrl: FormControl<string | null> = new FormControl('');
  public filteredCountries: ReplaySubject<string[]> = new ReplaySubject<string[]>(1);
  private _onDestroy = new Subject<void>();

  async ngOnInit(): Promise<void> {
    this.partnerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.partnerId;

    this.userProfileService.currentUserProfile$.subscribe((profile) => {
      console.log('User profile stream emitted:', profile);
    });

    this.partnerForm = this.fb.group({
      name: this.fb.control('', {
        nonNullable: true,
        validators: Validators.required,
      }),
      type: this.fb.control<PartnerType | null>(null, Validators.required),
      isActive: this.fb.control(true, { nonNullable: true }),
      subDmc: this.fb.control<string | null>(null),
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
    });

    // Use the observable directly from the service
    this.subDmcs$ = this.userProfileService.userSubDmcs$;

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

    if (this.isEditMode && this.partnerId) {
      const partnerData = await firstValueFrom(this.partnerService.get(this.partnerId));
      if (partnerData) {
        this.partnerForm.patchValue(partnerData as Partner);

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
