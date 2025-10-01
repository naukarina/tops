import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Material Imports
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-edit-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './edit-page.html',
  styleUrls: ['./edit-page.scss'],
})
export class EditPageComponent {
  @Input() title = '';
}
