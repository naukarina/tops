import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from './core/header/header';
import { SidenavComponent } from './core/sidenav/sidenav';
import { FooterComponent } from './core/footer/footer';
import { filter, map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    HeaderComponent,
    SidenavComponent,
    FooterComponent,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  showHeader = true;
  showFooter = true;
  showSidenav = true;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        mergeMap((route) => route.data)
      )
      .subscribe((data) => {
        this.showHeader = data['showHeader'] !== false;
        this.showFooter = data['showFooter'] !== false;
        this.showSidenav = data['showSidenav'] !== false;
      });
  }
}
