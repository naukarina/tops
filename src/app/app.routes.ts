import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { authGuard } from './core/auth/auth-guard';
import { ProductListComponent } from './pages/products/product-list/product-list';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: HomeComponent,
        data: {
          showHeader: true,
          showFooter: true,
          showSidenav: true,
        },
      },
      {
        path: 'products',
        component: ProductListComponent,
        data: {
          showHeader: true,
          showFooter: true,
          showSidenav: true,
        },
      },
    ],
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      showHeader: false,
      showFooter: false,
      showSidenav: false,
    },
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: {
      showHeader: false,
      showFooter: false,
      showSidenav: false,
    },
  },
];
