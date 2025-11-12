// src/app/pages/guests/guest-form.utils.ts
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { Guest, Pax } from '../../models/guest.model';
import { Partner } from '../../models/partner.model';
import { GuestForm } from './guest.form.model';

/**
 * Creates a new, empty FormGroup for guest details.
 */
export function createGuestForm(fb: FormBuilder): FormGroup<GuestForm> {
  return fb.group({
    name: fb.control('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    tourOperatorId: fb.control<string | null>(null, Validators.required),
    tourOperatorName: fb.control<string | null>({
      value: null,
      disabled: true,
    }),
    arrivalDate: fb.control<Date | null>(null),
    departureDate: fb.control<Date | null>(null),

    arrivalLocationSelect: fb.control<string | null>(null),
    arrivalLocationCustom: fb.control<string | null>(null),
    departureLocationSelect: fb.control<string | null>(null),
    departureLocationCustom: fb.control<string | null>(null),

    pax: fb.group({
      adult: fb.control<number | null>(null, [Validators.min(0)]),
      child: fb.control<number | null>(null, [Validators.min(0)]),
      infant: fb.control<number | null>(null, [Validators.min(0)]),
      total: fb.control<number | null>({ value: null, disabled: true }),
    }),
    email: fb.control<string | null>(null, [Validators.email]),
    tel: fb.control<string | null>(null),
    fileRef: fb.control<string | null>(null),
    remarks: fb.control<string | null>(null),
  });
}

/**
 * Converts a loaded Guest object into an object suitable for patching the GuestForm.
 * It handles Timestamp-to-Date conversion and resolves location fields.
 */
export function getGuestFormPatchValue(guestData: Guest, hotels: Partner[]): any {
  const formData: any = {
    ...guestData,
    arrivalDate: guestData.arrivalDate ? guestData.arrivalDate.toDate() : null,
    departureDate: guestData.departureDate ? guestData.departureDate.toDate() : null,
  };

  // Resolve arrival location
  const arrivalHotel = hotels.find((h) => h.name === guestData.arrivalLocation);
  if (arrivalHotel) {
    formData.arrivalLocationSelect = arrivalHotel.name;
    formData.arrivalLocationCustom = null;
  } else if (guestData.arrivalLocation) {
    formData.arrivalLocationSelect = 'Custom';
    formData.arrivalLocationCustom = guestData.arrivalLocation;
  } else {
    formData.arrivalLocationSelect = null;
    formData.arrivalLocationCustom = null;
  }

  // Resolve departure location
  const departureHotel = hotels.find((h) => h.name === guestData.departureLocation);
  if (departureHotel) {
    formData.departureLocationSelect = departureHotel.name;
    formData.departureLocationCustom = null;
  } else if (guestData.departureLocation) {
    formData.departureLocationSelect = 'Custom';
    formData.departureLocationCustom = guestData.departureLocation;
  } else {
    formData.departureLocationSelect = null;
    formData.departureLocationCustom = null;
  }

  return formData;
}

/**
 * Prepares the raw form value for saving to Firestore.
 * Converts Dates to Timestamps and resolves location fields.
 */
export function prepareGuestPayload(formValue: any): Partial<Guest> {
  const paxValue = formValue.pax;
  const totalPax = (paxValue.adult || 0) + (paxValue.child || 0) + (paxValue.infant || 0);

  const guestPayload: Partial<Guest> = {
    name: formValue.name,
    tourOperatorId: formValue.tourOperatorId,
    tourOperatorName: formValue.tourOperatorName,

    email: formValue.email ?? null,
    tel: formValue.tel ?? null,
    fileRef: formValue.fileRef ?? null,
    remarks: formValue.remarks ?? null,

    pax: {
      adult: paxValue.adult ?? null,
      child: paxValue.child ?? null,
      infant: paxValue.infant ?? null,
      total: totalPax,
    },
    arrivalDate: formValue.arrivalDate ? Timestamp.fromDate(formValue.arrivalDate) : null,
    departureDate: formValue.departureDate ? Timestamp.fromDate(formValue.departureDate) : null,

    arrivalLocation:
      (formValue.arrivalLocationSelect === 'Custom'
        ? formValue.arrivalLocationCustom
        : formValue.arrivalLocationSelect) ?? null,
    departureLocation:
      (formValue.departureLocationSelect === 'Custom'
        ? formValue.departureLocationCustom
        : formValue.departureLocationSelect) ?? null,
  };

  return guestPayload;
}
