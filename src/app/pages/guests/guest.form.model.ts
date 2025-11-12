// src/app/pages/guests/guest.form.model.ts
import { FormControl, FormGroup } from '@angular/forms';
import { Pax } from '../../models/guest.model';

// Defines the structure of the reusable guest form
export interface GuestForm {
  name: FormControl<string>;
  email: FormControl<string | null>;
  tel: FormControl<string | null>;
  fileRef: FormControl<string | null>;
  remarks: FormControl<string | null>;
  tourOperatorId: FormControl<string | null>;
  tourOperatorName: FormControl<string | null>;
  arrivalDate: FormControl<Date | null>;
  departureDate: FormControl<Date | null>;

  // Controls for the location select/custom logic
  arrivalLocationSelect: FormControl<string | null>;
  arrivalLocationCustom: FormControl<string | null>;
  departureLocationSelect: FormControl<string | null>;
  departureLocationCustom: FormControl<string | null>;

  pax: FormGroup<{
    adult: FormControl<number | null>;
    child: FormControl<number | null>;
    infant: FormControl<number | null>;
    total: FormControl<number | null>;
  }>;
}
