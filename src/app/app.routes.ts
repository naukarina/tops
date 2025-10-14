import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'partners',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/partners/partner-list/partner-list').then((m) => m.PartnerListComponent),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./pages/partners/partner-edit/partner-edit').then((m) => m.PartnerEditComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/partners/partner-edit/partner-edit').then((m) => m.PartnerEditComponent),
      },
    ],
  },
  {
    path: 'products',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/products/product-list/product-list').then((m) => m.ProductListComponent),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./pages/products/product-edit/product-edit').then((m) => m.ProductEditComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/products/product-edit/product-edit').then((m) => m.ProductEditComponent),
      },
    ],
  },
  {
    path: 'users',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/users/user-list/user-list').then((m) => m.UserListComponent),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./pages/users/user-edit/user-edit').then((m) => m.UserEditComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/users/user-edit/user-edit').then((m) => m.UserEditComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'home' }, // Wildcard route
];
