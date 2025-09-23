import { Routes } from '@angular/router';
import { LayoutComponent } from './core/layout/layout';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { ProductManagementComponent } from './pages/products/product-management/product-management';
import { AuthGuard } from '@angular/fire/auth-guard';
import { ProductListComponent } from './pages/products/product-list/product-list';
import { ProductEditComponent } from './pages/products/product-edit/product-edit';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'products', component: ProductListComponent },
      { path: 'products/new', component: ProductEditComponent },
      { path: 'products/:id/edit', component: ProductEditComponent },
    ],
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
];
