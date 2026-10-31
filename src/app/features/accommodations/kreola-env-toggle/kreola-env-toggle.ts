import { Component, inject, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { KreolaEnv, KreolaEnvService } from '../services/kreola-env.service';

// Prod / Dev switch for the Kreola API (merchants, hotels, prices).
@Component({
  selector: 'app-kreola-env-toggle',
  standalone: true,
  imports: [MatButtonToggleModule, MatIconModule],
  template: `
    <div class="env-toggle" [class.is-dev]="envService.env() === 'dev'">
      <mat-icon>{{ envService.env() === 'dev' ? 'science' : 'cloud_done' }}</mat-icon>
      <span class="label">Kreola API</span>
      <mat-button-toggle-group
        [value]="envService.env()"
        hideSingleSelectionIndicator
        aria-label="Kreola environment"
        (change)="onChange($event.value)"
      >
        <mat-button-toggle value="prod">Prod</mat-button-toggle>
        <mat-button-toggle value="dev">Dev</mat-button-toggle>
      </mat-button-toggle-group>
    </div>
  `,
  styles: `
    .env-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px 4px 12px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      background: #fff;
    }
    .env-toggle.is-dev {
      border-color: #f57c00;
      background: #fff3e0;
      mat-icon {
        color: #f57c00;
      }
    }
    .label {
      font-size: 13px;
      color: rgba(0, 0, 0, 0.6);
    }
    mat-button-toggle-group {
      --mat-standard-button-toggle-height: 32px;
      height: 32px;
    }
  `,
})
export class KreolaEnvToggleComponent {
  envService = inject(KreolaEnvService);
  changed = output<KreolaEnv>();

  onChange(env: KreolaEnv) {
    if (env === this.envService.env()) return;
    this.envService.set(env);
    this.changed.emit(env);
  }
}
