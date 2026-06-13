import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IImportStrategy, CsvRow } from '../import-strategy.interface';
import { Partner } from '../../partners/models/partner.model';
import { PartnerService } from '../../partners/services/partner.service';

@Injectable({ providedIn: 'root' })
export class PartnerApiCodeImportStrategy implements IImportStrategy<Partner> {
  name = 'Partner API Codes (Kreola)';
  service = inject(PartnerService);

  private partnersByName = new Map<string, Partner>();

  async prepare(): Promise<void> {
    const partners = await firstValueFrom(this.service.getAll());
    this.partnersByName.clear();
    for (const partner of partners) {
      this.partnersByName.set(partner.name.trim().toLowerCase(), partner);
    }
  }

  async processRow(row: CsvRow): Promise<boolean> {
    const name = row['name']?.trim();
    const apiCode = row['id']?.trim();

    if (!name || !apiCode) return false;

    const partner = this.partnersByName.get(name.toLowerCase());
    if (!partner?.id) return false;

    await this.service.update(partner.id, { apiCode } as Partial<Partner>);
    return true;
  }

  mapRow(_row: CsvRow): Partial<Partner> | null {
    return null;
  }
}
