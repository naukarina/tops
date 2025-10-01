import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from './core/header/header';
import { SidenavComponent } from './core/sidenav/sidenav';
import { FooterComponent } from './core/footer/footer';
import { HomeComponent } from './pages/home/home';

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
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  title = 'my-dashboard-app';
}
