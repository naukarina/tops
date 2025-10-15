import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
  PRIMARY_OUTLET,
} from '@angular/router';
import { filter } from 'rxjs/operators';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from './core/header/header';
import { SidenavComponent } from './core/sidenav/sidenav';
import { Breadcrumb, BreadcrumbComponent } from './core/breadcrumb/breadcrumb';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    HeaderComponent,
    SidenavComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent implements OnInit {
  title = 'tops';
  showHeader = true;
  showSidenav = true;
  breadcrumbs: Breadcrumb[] = [];

  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  ngOnInit() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
      const routeData = this.getRouteData(this.activatedRoute.root);
      this.showHeader = routeData['showHeader'] !== false;
      this.showSidenav = routeData['showSidenav'] !== false;
    });
  }

  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumb[] = []
  ): Breadcrumb[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      if (child.outlet !== PRIMARY_OUTLET) {
        continue;
      }

      const routeURL: string = child.snapshot.url.map((segment) => segment.path).join('/');
      const newUrl = url + (routeURL ? `/${routeURL}` : '');

      const breadcrumbLabel = child.snapshot.data['breadcrumb'];
      if (breadcrumbLabel) {
        breadcrumbs.push({ label: breadcrumbLabel, url: newUrl });
      }

      return this.createBreadcrumbs(child, newUrl, breadcrumbs);
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
