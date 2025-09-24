// src/app/pages/home/home.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-home',
  standalone: true, // Add standalone: true
  imports: [CommonModule], // Add imports array
  templateUrl: './home.html',
  // styleUrls: ['./home.scss'], // You can create this file if needed
})
export class HomeComponent {}
