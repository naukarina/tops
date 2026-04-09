import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material & Router
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router'; // Replaces individual RouterLink imports

// Services & Models
import { HasAccessDirective } from '@shared/directives/has-access.directive';
import { AppFeatureService } from '../services/app-feature.service';
import { AppFeature } from '../models/app-feature.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, RouterModule, HasAccessDirective],
  templateUrl: './sidenav.html',
  styleUrls: ['./sidenav.scss'],
})
export class SidenavComponent {
  private featureService = inject(AppFeatureService);

  // Fetch active features and sort them by the 'order' property
  navItems$: Observable<AppFeature[]> = this.featureService
    .getAll()
    .pipe(
      map((features) =>
        features
          .filter((feature) => feature.isActive)
          .sort((a, b) => (a.order || 0) - (b.order || 0)),
      ),
    );
}
