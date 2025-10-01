import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule],
  templateUrl: './sidenav.html',
  styleUrls: ['./sidenav.scss'],
})
export class SidenavComponent {
  navItems = [
    { name: 'Dashboard', icon: 'dashboard', active: true },
    { name: 'Analytics', icon: 'analytics', active: false },
    { name: 'Products', icon: 'store', active: false },
    { name: 'Settings', icon: 'settings', active: false },
  ];
}
