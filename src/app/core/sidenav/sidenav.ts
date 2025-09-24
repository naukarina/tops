// src/app/core/sidenav/sidenav.ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule], // Add RouterModule
  templateUrl: './sidenav.html',
  styleUrls: ['./sidenav.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavComponent {
  isOpen = input.required<boolean>();
  isMobile = input.required<boolean>();

  // Updated navigation items
  navItems = [
    { name: 'Dashboard', path: '/home', active: true },
    { name: 'Analytics', path: '/analytics', active: false },
    { name: 'Products', path: '/products', active: false },
    { name: 'Settings', path: '/settings', active: false },
  ];
}
