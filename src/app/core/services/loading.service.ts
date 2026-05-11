import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const SHOW_DELAY_MS = 200;

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingCount = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private loadingSubject = new BehaviorSubject<boolean>(false);

  isLoading$ = this.loadingSubject.asObservable();

  show(): void {
    this.loadingCount++;
    if (this.loadingCount === 1 && !this.loadingSubject.value && this.showTimer === null) {
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        if (this.loadingCount > 0) {
          this.loadingSubject.next(true);
        }
      }, SHOW_DELAY_MS);
    }
  }

  hide(): void {
    this.loadingCount--;
    if (this.loadingCount <= 0) {
      this.loadingCount = 0;
      if (this.showTimer !== null) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      if (this.loadingSubject.value) {
        this.loadingSubject.next(false);
      }
    }
  }
}
