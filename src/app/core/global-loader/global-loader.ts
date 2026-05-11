import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-global-loader',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    @if (loadingService.isLoading$ | async) {
      <div class="loader-overlay">
        <mat-spinner diameter="50" color="primary"></mat-spinner>
      </div>
    }
  `,
  styles: [
    `
      .loader-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(255, 255, 255, 0.7);
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `,
  ],
})
export class GlobalLoaderComponent {
  loadingService = inject(LoadingService);
}
