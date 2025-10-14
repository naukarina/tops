import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { UserProfile } from '../../../models/user-profile.model';
import { UserService } from '../../../services/user.service';
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ListPageComponent,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss'],
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);

  users$!: Observable<UserProfile[]>;
  displayedColumns: string[] = ['name', 'email', 'companyName', 'actions'];

  ngOnInit() {
    this.users$ = this.userService.getAll();
  }

  deleteUser(id: string) {
    // Note: This only deletes the Firestore document. Deleting the actual
    // Firebase Auth user requires a Cloud Function with Admin privileges
    // to avoid security risks on the client side.
    if (confirm('Are you sure you want to delete this user profile?')) {
      this.userService.delete(id);
    }
  }
}
