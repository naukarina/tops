import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { authGuard } from './core/auth/auth-guard';
import { ProductListComponent } from './pages/products/product-list/product-list';
import { ProductEditComponent } from './pages/products/product-edit/product-edit';

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
      { path: '', component: HomeComponent },
      { path: 'products', component: ProductListComponent },
      { path: 'products/new', component: ProductEditComponent },
      { path: 'products/:id/edit', component: ProductEditComponent },
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
