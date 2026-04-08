import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { featureGuard } from '@core/auth/feature.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
    canActivate: [authGuard],
    data: { breadcrumb: 'Home' },
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.LoginComponent),
    data: {
      showHeader: false,
      showSidenav: false,
    },
  },
  {
    path: 'register',
    loadComponent: () => import('./features/register/register').then((m) => m.RegisterComponent),
    data: {
      showHeader: false,
      showSidenav: false,
    },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
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
          import('./features/partners/partner-list/partner-list').then(
            (m) => m.PartnerListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/partners/partner-edit/partner-edit').then(
            (m) => m.PartnerEditComponent,
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./features/partners/partner-edit/partner-edit').then(
            (m) => m.PartnerEditComponent,
          ),
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
          import('./features/guests/guest-list/guest-list').then((m) => m.GuestListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/guests/guest-edit/guest-edit').then((m) => m.GuestEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./features/guests/guest-edit/guest-edit').then((m) => m.GuestEditComponent),
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
        canActivate: [featureGuard('products', 'readonly')],
        loadComponent: () =>
          import('./features/products/product-list/product-list').then(
            (m) => m.ProductListComponent,
          ),
      },
      {
        path: 'new',
        canActivate: [featureGuard('products', 'user')],
        loadComponent: () =>
          import('./features/products/product-edit/product-edit').then(
            (m) => m.ProductEditComponent,
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        canActivate: [featureGuard('products', 'user')],
        loadComponent: () =>
          import('./features/products/product-edit/product-edit').then(
            (m) => m.ProductEditComponent,
          ),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'pricelists',
    canActivate: [authGuard],
    data: { breadcrumb: 'Pricelists' },
    children: [
      {
        path: '',
        // Viewing the list requires 'readonly' access
        canActivate: [featureGuard('pricelists', 'readonly')],
        loadComponent: () =>
          import('./features/pricelists/pricelist-list/pricelist-list').then(
            (m) => m.PricelistListComponent,
          ),
      },
      {
        path: 'new',
        // Creating a new one requires standard 'user' access
        canActivate: [featureGuard('pricelists', 'user')],
        loadComponent: () =>
          import('./features/pricelists/pricelist-edit/pricelist-edit').then(
            (m) => m.PricelistEditComponent,
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        // Editing requires standard 'user' access
        canActivate: [featureGuard('pricelists', 'user')],
        loadComponent: () =>
          import('./features/pricelists/pricelist-edit/pricelist-edit').then(
            (m) => m.PricelistEditComponent,
          ),
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
          import('./features/users/user-list/user-list').then((m) => m.UserListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/users/user-edit/user-edit').then((m) => m.UserEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./features/users/user-edit/user-edit').then((m) => m.UserEditComponent),
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
          import('./features/sales-orders/pages/sales-order-list/sales-order-list').then(
            (m) => m.SalesOrderListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/sales-orders/pages/sales-order-edit/sales-order-edit').then(
            (m) => m.SalesOrderEditComponent,
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./features/sales-orders/pages/sales-order-edit/sales-order-edit').then(
            (m) => m.SalesOrderEditComponent,
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
          import('./features/accommodations/accommodation-list/accommodation-list').then(
            (m) => m.AccommodationListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/accommodations/accommodation-edit/accommodation-edit').then(
            (m) => m.AccommodationEditComponent,
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./features/accommodations/accommodation-edit/accommodation-edit').then(
            (m) => m.AccommodationEditComponent,
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
          import('./features/items/item-list/item-list').then((m) => m.ItemListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/items/item-edit/item-edit').then((m) => m.ItemEditComponent),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./features/items/item-edit/item-edit').then((m) => m.ItemEditComponent),
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
          import('./features/vehicle-categories/vehicle-category-list/vehicle-category-list').then(
            (m) => m.VehicleCategoryListComponent,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/vehicle-categories/vehicle-category-edit/vehicle-category-edit').then(
            (m) => m.VehicleCategoryEditComponent,
          ),
        data: { breadcrumb: 'Create' },
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./features/vehicle-categories/vehicle-category-edit/vehicle-category-edit').then(
            (m) => m.VehicleCategoryEditComponent,
          ),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  {
    path: 'admin/import',
    // You can add a canActivate: [adminGuard] here
    loadComponent: () =>
      import('./features/migration/migration-page/migration-page').then(
        (m) => m.MigrationPageComponent,
      ),
  },
  {
    path: 'app-features',
    canActivate: [authGuard],
    data: { breadcrumb: 'System Features' },
    children: [
      {
        path: '',
        // Require at least admin to even see the settings page
        canActivate: [featureGuard('app-features', 'admin')],
        loadComponent: () =>
          import('./features/app-features/app-feature-list/app-feature-list').then(
            (m) => m.AppFeatureListComponent,
          ),
      },
      {
        path: 'new',
        canActivate: [featureGuard('app-features', 'admin')],
        loadComponent: () =>
          import('./features/app-features/app-feature-edit/app-feature-edit').then(
            (m) => m.AppFeatureEditComponent,
          ),
        data: { breadcrumb: 'New' },
      },
      {
        path: 'edit/:id',
        canActivate: [featureGuard('app-features', 'admin')],
        loadComponent: () =>
          import('./features/app-features/app-feature-edit/app-feature-edit').then(
            (m) => m.AppFeatureEditComponent,
          ),
        data: { breadcrumb: 'Edit' },
      },
    ],
  },
  { path: '**', redirectTo: 'home' }, // Wildcard route
];
