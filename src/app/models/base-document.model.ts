import { Timestamp } from '@angular/fire/firestore';

export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface BaseDocument {
  id: string; // The Firestore document ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User ID of the creator
  updatedBy: string; // User ID of the last user who updated it
  documentStatus: DocumentStatus; // Status of the document
}
