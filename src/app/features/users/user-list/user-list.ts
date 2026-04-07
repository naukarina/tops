import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

import { UserProfile } from '../../../core/models/user-profile.model';
import { UserService } from '../services/user.service';
import { NotificationService } from '../../../core/services/notification.service';

// Shared Components
import { ListPageComponent } from '../../../shared/components/list-page/list-page';
import { DataTableComponent } from '../../../shared/components/data-table/data-table';
import { ColumnDefinition } from '../../../shared/components/data-table/column-definition.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ListPageComponent,
    DataTableComponent, // Added the new data table component
  ],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss'],
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);

  users$!: Observable<UserProfile[]>;

  // Define the columns to display (matching your existing ones)
  columnsForTable = ['name', 'email', 'companyName'];

  // Define how the data table should read and display the data
  columnDefs: ColumnDefinition<UserProfile>[] = [
    { columnDef: 'name', header: 'Name', cell: (u) => u.name, isSortable: true },
    { columnDef: 'email', header: 'Email', cell: (u) => u.email, isSortable: true },
    {
      columnDef: 'companyName',
      header: 'Company',
      cell: (u) => u.companyName || '',
      isSortable: true,
    },
  ];

  // Provide the edit route function for the data table
  userEditRoute = (user: UserProfile) => ['/users/edit', user.id];

  ngOnInit() {
    this.users$ = this.userService.getAll();
  }

  // Adjusted to accept the full UserProfile object from the data table event
  async deleteUser(user: UserProfile) {
    // Note: This only deletes the Firestore document. Deleting the actual
    // Firebase Auth user requires a Cloud Function with Admin privileges.
    if (confirm(`Are you sure you want to delete the user profile for "${user.name}"?`)) {
      try {
        await this.userService.delete(user.id);
        this.notificationService.showSuccess('User deleted successfully.');
      } catch (error) {
        console.error('Error deleting user:', error);
        this.notificationService.showError('Failed to delete user.');
      }
    }
  }
}
