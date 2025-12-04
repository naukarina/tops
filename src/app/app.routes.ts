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
    path: 'sales-orders',
    canActivate: [authGuard],
    data: { breadcrumb: 'Sales Orders' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/sales-orders/sales-order-list/sales-order-list').then(
            (m) => m.SalesOrderListComponent
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/sales-orders/sales-order-edit/sales-order-edit').then(
            (m) => m.SalesOrderEditComponent
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/sales-orders/sales-order-edit/sales-order-edit').then(
            (m) => m.SalesOrderEditComponent
          ),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'accommodations',
    canActivate: [authGuard],
    data: { breadcrumb: 'Accommodations' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/accommodations/accommodation-list/accommodation-list').then(
            (m) => m.AccommodationListComponent
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/accommodations/accommodation-edit/accommodation-edit').then(
            (m) => m.AccommodationEditComponent
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/accommodations/accommodation-edit/accommodation-edit').then(
            (m) => m.AccommodationEditComponent
          ),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'items',
    canActivate: [authGuard],
    data: { breadcrumb: 'Items' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/items/item-list/item-list').then((m) => m.ItemListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/items/item-edit/item-edit').then((m) => m.ItemEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/items/item-edit/item-edit').then((m) => m.ItemEditComponent),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'vehicle-categories',
    canActivate: [authGuard],
    data: { breadcrumb: 'Vehicle Categories' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/vehicle-categories/vehicle-category-list/vehicle-category-list').then(
            (m) => m.VehicleCategoryListComponent
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/vehicle-categories/vehicle-category-edit/vehicle-category-edit').then(
            (m) => m.VehicleCategoryEditComponent
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/vehicle-categories/vehicle-category-edit/vehicle-category-edit').then(
            (m) => m.VehicleCategoryEditComponent
          ),
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
