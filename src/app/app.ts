import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
  PRIMARY_OUTLET,
} from '@angular/router';
import { filter } from 'rxjs/operators';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from './core/header/header';
import { SidenavComponent } from './core/sidenav/sidenav';
import { FooterComponent } from './core/footer/footer';
import { Breadcrumb, BreadcrumbComponent } from './core/breadcrumb/breadcrumb';

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
    BreadcrumbComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent implements OnInit {
  showHeader = true;
  showFooter = true;
  showSidenav = true;
  breadcrumbs: Breadcrumb[] = [];

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
      const routeData = this.getRouteData(this.activatedRoute.root);
      this.showHeader = routeData['showHeader'] !== false;
      this.showFooter = routeData['showFooter'] !== false;
      this.showSidenav = routeData['showSidenav'] !== false;
    });
  }

  private createBreadcrumbs(route: ActivatedRoute): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    let currentRoute: ActivatedRoute | null = route.root;
    let url = '';

    while (currentRoute?.firstChild) {
      currentRoute = currentRoute.firstChild;
      const routeURL = currentRoute.snapshot.url.map((segment) => segment.path).join('/');
      const breadcrumbLabel = currentRoute.snapshot.data['breadcrumb'];

      if (routeURL && breadcrumbLabel) {
        url += `/${routeURL}`;
        breadcrumbs.push({
          label: breadcrumbLabel,
          url: url,
        });
      } else if (breadcrumbLabel) {
        // Handle root breadcrumb
        breadcrumbs.push({
          label: breadcrumbLabel,
          url: '/',
        });
      }
    }
    return breadcrumbs;
  }

  private getRouteData(route: ActivatedRoute): any {
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data;
  }
}
