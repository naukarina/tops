import {
  Component,
  signal,
  ChangeDetectionStrategy,
  HostBinding,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header';
import { SidenavComponent } from '../sidenav/sidenav';
import { FooterComponent } from '../footer/footer';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SidenavComponent, FooterComponent, RouterOutlet],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  isSidenavOpen: WritableSignal<boolean> = signal<boolean>(true);
  isDarkMode: WritableSignal<boolean> = signal<boolean>(false);
  isMobile: WritableSignal<boolean> = signal<boolean>(false);

  @HostBinding('class.dark') get darkMode() {
    return this.isDarkMode();
  }

  constructor() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      this.isDarkMode.set(true);
    }
  }

  checkScreenSize() {
    this.isMobile.set(typeof window !== 'undefined' && window.innerWidth < 768);
    if (this.isMobile()) {
      this.isSidenavOpen.set(false);
    } else {
      this.isSidenavOpen.set(true);
    }
  }

  toggleTheme() {
    this.isDarkMode.update((value) => !value);
  }

  toggleSidenav() {
    this.isSidenavOpen.update((value) => !value);
  }
}
