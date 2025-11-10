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
    data: { breadcrumb: 'Home' },
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
    data: {
      showHeader: false,
      showSidenav: false,
    },
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent),
    data: {
      showHeader: false,
      showSidenav: false,
    },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
    data: {
      showHeader: false,
      showSidenav: false,
    },
  },
  {
    path: 'partners',
    canActivate: [authGuard],
    data: { breadcrumb: 'Partners' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/partners/partner-list/partner-list').then((m) => m.PartnerListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/partners/partner-edit/partner-edit').then((m) => m.PartnerEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/partners/partner-edit/partner-edit').then((m) => m.PartnerEditComponent),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'guests',
    canActivate: [authGuard],
    data: { breadcrumb: 'Guests' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/guests/guest-list/guest-list').then((m) => m.GuestListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/guests/guest-edit/guest-edit').then((m) => m.GuestEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/guests/guest-edit/guest-edit').then((m) => m.GuestEditComponent),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'products',
    canActivate: [authGuard],
    data: { breadcrumb: 'Products' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/products/product-list/product-list').then((m) => m.ProductListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/products/product-edit/product-edit').then((m) => m.ProductEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/products/product-edit/product-edit').then((m) => m.ProductEditComponent),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'users',
    canActivate: [authGuard],
    data: { breadcrumb: 'Users' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/users/user-list/user-list').then((m) => m.UserListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/users/user-edit/user-edit').then((m) => m.UserEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/users/user-edit/user-edit').then((m) => m.UserEditComponent),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'admin/import',
    // You can add a canActivate: [adminGuard] here
    loadComponent: () =>
      import('./pages/migration/migration-page/migration-page').then(
        (m) => m.MigrationPageComponent
      ),
  },
  { path: '**', redirectTo: 'home' }, // Wildcard route
];
