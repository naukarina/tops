import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { authGuard } from './core/auth/auth-guard';
import { ProductListComponent } from './pages/products/product-list/product-list';
import { ProductEditComponent } from './pages/products/product-edit/product-edit';
import { PartnerListComponent } from './pages/partners/partner-list/partner-list';
import { PartnerEditComponent } from './pages/partners/partner-edit/partner-edit';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    data: {
      showHeader: true,
      showFooter: true,
      showSidenav: true,
    },
    children: [
      { path: '', component: HomeComponent, data: { breadcrumb: 'Dashboard' } },
      {
        path: 'products',
        data: { breadcrumb: 'Products' },
        children: [
          {
            path: '',
            component: ProductListComponent,
            pathMatch: 'full',
          },
          {
            path: 'new',
            component: ProductEditComponent,
            data: { breadcrumb: 'New' },
          },
          {
            path: ':id/edit',
            component: ProductEditComponent,
            data: { breadcrumb: 'Edit' },
          },
        ],
      },
      {
        path: 'partners',
        data: { breadcrumb: 'Partners' },
        children: [
          {
            path: '',
            component: PartnerListComponent,
            pathMatch: 'full',
          },
          {
            path: 'new',
            component: PartnerEditComponent,
            data: { breadcrumb: 'New' },
          },
          {
            path: ':id/edit',
            component: PartnerEditComponent,
            data: { breadcrumb: 'Edit' },
          },
        ],
      },
    ],
  },
  {
    path: '',
    data: {
      showHeader: false,
      showFooter: false,
      showSidenav: false,
    },
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ],
  },
];
