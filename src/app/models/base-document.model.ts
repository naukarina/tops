import { Timestamp } from '@angular/fire/firestore';

export interface BaseDocument {
  id: string; // The Firestore document ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User ID of the creator
  updatedBy: string; // User ID of the last user who updated it
}
