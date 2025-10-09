import { inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  DocumentData,
  CollectionReference,
} from '@angular/fire/firestore';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseDocument, DocStatus } from '../models/base-document.model';
import { AuthService } from '../core/auth/auth.service';
import { NotificationService } from './notification.service';

export class BaseService<T extends BaseDocument> {
  protected firestore = inject(Firestore);
  protected authService = inject(AuthService);
  protected notificationService = inject(NotificationService);
  protected collection: CollectionReference<DocumentData>;

  constructor(private collectionName: string) {
    this.collection = collection(this.firestore, collectionName);
  }

  // Handle errors for Observable-based methods
  getAll(): Observable<T[]> {
    return (collectionData(this.collection, { idField: 'id' }) as Observable<T[]>).pipe(
      catchError((error) => {
        console.error(`Error fetching data from ${this.collectionName}:`, error);
        this.notificationService.showError(
          `Failed to load ${this.collectionName}. Please try again later.`
        );
        return throwError(() => new Error('Firestore read operation failed'));
      })
    );
  }

  // Handle errors for Promise-based methods
  async get(id: string) {
    try {
      const docRef = doc(this.firestore, `${this.collection.path}/${id}`);
      return await getDoc(docRef);
    } catch (error) {
      console.error(`Error fetching document ${id} from ${this.collectionName}:`, error);
      this.notificationService.showError('Failed to load the document.');
      throw error; // Re-throw the error to be handled by the component if needed
    }
  }

  async add(item: T) {
    try {
      const user = this.authService.currentUser;
      const newDoc = {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: DocStatus.ACTIVE,
        createdBy: user?.uid || '',
        createdByName: user?.displayName || '',
        updatedBy: user?.uid || '',
        updatedByName: user?.displayName || '',
      };
      return await addDoc(this.collection, newDoc);
    } catch (error) {
      console.error(`Error adding document to ${this.collectionName}:`, error);
      this.notificationService.showError('Failed to save the new item.');
      throw error;
    }
  }

  async update(id: string, item: Partial<T>) {
    try {
      const user = this.authService.currentUser;
      const docRef = doc(this.firestore, `${this.collection.path}/${id}`);
      const updatedDoc: { [key: string]: any } = {
        ...item,
        updatedAt: new Date(),
        updatedBy: user?.uid || '',
        updatedByName: user?.displayName || '',
      };
      return await updateDoc(docRef, updatedDoc);
    } catch (error) {
      console.error(`Error updating document ${id} in ${this.collectionName}:`, error);
      this.notificationService.showError('Failed to update the item.');
      throw error;
    }
  }
}
