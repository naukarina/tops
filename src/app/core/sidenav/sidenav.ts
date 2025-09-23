import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [MatListModule, RouterModule, MatIconModule], // Add MatIconModule here
  templateUrl: './sidenav.html',
  styleUrls: ['./sidenav.scss'], // Add this line
})
export class SidenavComponent {}
