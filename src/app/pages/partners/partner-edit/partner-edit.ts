import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';
import { PartnerService } from '../../../services/partner.service';

// Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Shared Components
import { EditPageComponent } from '../../../shared/components/edit-page/edit-page';

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
  ],
  templateUrl: './partner-edit.html',
  styleUrls: ['./partner-edit.scss'],
})
export class PartnerEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private partnerService = inject(PartnerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  partnerForm!: FormGroup;
  isEditMode = false;
  private partnerId: string | null = null;

  ngOnInit(): void {
    this.partnerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.partnerId;

    this.partnerForm = this.fb.group({
      name: ['', Validators.required],
      contactPerson: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });

    if (this.isEditMode && this.partnerId) {
      this.partnerService
        .getPartner(this.partnerId)
        .pipe(first())
        .subscribe((partner) => {
          this.partnerForm.patchValue(partner);
        });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.partnerForm.invalid) {
      return;
    }

    if (this.isEditMode && this.partnerId) {
      await this.partnerService.updatePartner(this.partnerId, this.partnerForm.value);
    } else {
      await this.partnerService.addPartner(this.partnerForm.value);
    }
    this.router.navigate(['/partners']);
  }
}
