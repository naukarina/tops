import { Component, OnInit, OnDestroy, Input, forwardRef, inject } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { Observable, ReplaySubject, Subject, isObservable, of } from 'rxjs';
import { takeUntil, startWith, map } from 'rxjs/operators';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './searchable-select.html',
  styleUrls: ['./searchable-select.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent implements OnInit, OnDestroy, ControlValueAccessor {
  // --- Component Inputs ---
  @Input() label: string = 'Select';
  @Input() options: Observable<any[]> | any[] = [];
  @Input() multiple: boolean = false;
  @Input() searchable: boolean = false;
  @Input() optionValue: string | undefined = undefined; // Property to use for value
  @Input() optionText: string | undefined = undefined; // Property to display

  // --- Internal State ---
  protected value: any = null;
  protected isDisabled = false;
  protected searchCtrl = new FormControl('');
  protected filteredOptions$ = new ReplaySubject<any[]>(1);
  private options$!: Observable<any[]>;
  private _onDestroy = new Subject<void>();

  // --- ControlValueAccessor Functions ---
  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    // 1. Normalize the options input into an observable
    this.options$ = isObservable(this.options) ? this.options : of(this.options || []);

    // 2. Combine options and search to create the filtered list
    this.searchCtrl.valueChanges
      .pipe(startWith(''), takeUntil(this._onDestroy))
      .subscribe((search) => {
        this.options$.subscribe((opts) => {
          this.filterOptions(opts, search || '');
        });
      });
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  // --- Internal Methods ---
  private filterOptions(options: any[], search: string) {
    if (!options) {
      this.filteredOptions$.next([]);
      return;
    }
    if (!search) {
      this.filteredOptions$.next(options.slice());
      return;
    }

    const searchLower = search.toLowerCase();
    this.filteredOptions$.next(
      options.filter((option) => {
        const text = this.getOptionText(option) || '';
        return String(text).toLowerCase().includes(searchLower);
      })
    );
  }

  protected onSelectionChange(value: any) {
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }

  // --- Template Helper Methods ---
  protected getOptionValue(option: any): any {
    if (this.optionValue) {
      return option[this.optionValue];
    }
    return option;
  }

  protected getOptionText(option: any): string {
    if (this.optionText) {
      return option[this.optionText];
    }
    return option;
  }
}
