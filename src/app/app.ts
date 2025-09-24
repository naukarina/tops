import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

// Import Layout Components
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from './core/header/header';
import { SidenavComponent } from './core/sidenav/sidenav';
import { FooterComponent } from './core/footer/footer';
import { LayoutComponent } from './core/layout/layout';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, LayoutComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  private router = inject(Router);
  showLayout = false;

  constructor() {
    // Logic to show/hide the main layout based on the route
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showLayout = !(
          event.urlAfterRedirects === '/login' || event.urlAfterRedirects === '/register'
        );
      });
  }
}
