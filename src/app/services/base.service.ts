import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  collectionData,
  docData,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, of, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { BaseDocument, DocStatus } from '../models/base-document.model';
import { NotificationService } from './notification.service';
import { AuthService } from '../core/auth/auth.service';
import { CompanyType } from '../models/company.model';

@Injectable({
  providedIn: 'root',
})
export abstract class BaseService<T extends BaseDocument> {
  protected collection;

  protected firestore: Firestore = inject(Firestore);
  protected notificationService: NotificationService = inject(NotificationService);
  protected authService: AuthService = inject(AuthService);

  constructor(protected collectionName: string) {
    this.collection = collection(this.firestore, this.collectionName);
  }

  getAll(): Observable<T[]> {
    return this.authService.userProfileState$.pipe(
      switchMap((userProfile) => {
        if (!userProfile || !userProfile.companyId) {
          return of([]); // If no user or company, return empty array.
        }

        if (userProfile.companyType === CompanyType.PLANNING) {
          // User is in a PLANNING company, so fetch docs for all related DMCs.
          const companiesCollection = collection(this.firestore, 'companies');
          const planningQuery = query(
            companiesCollection,
            where('planningCompanyId', '==', userProfile.companyId)
          );

          return from(getDocs(planningQuery)).pipe(
            switchMap((snapshot) => {
              const dmcCompanyIds = snapshot.docs.map((doc) => doc.id);
              // Also include the planning company's own documents.
              const allCompanyIds = [userProfile.companyId, ...dmcCompanyIds];

              if (allCompanyIds.length === 0) {
                return of([]);
              }

              const finalQuery = query(this.collection, where('companyId', 'in', allCompanyIds));
              return collectionData(finalQuery, { idField: 'id' }) as Observable<T[]>;
            })
          );
        } else {
          // For all other company types, fetch docs for their own companyId.
          const q = query(this.collection, where('companyId', '==', userProfile.companyId));
          return collectionData(q, { idField: 'id' }) as Observable<T[]>;
        }
      })
    );
  }

  get(id: string): Observable<T> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return docData(docRef, { idField: 'id' }) as Observable<T>;
  }

  async add(item: T) {
    try {
      const userProfile = this.authService.currentUserProfile;
      if (!userProfile) throw new Error('User not logged in or profile not loaded');

      const newDoc = {
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
        documentStatus: DocStatus.ACTIVE,
        createdBy: userProfile.id,
        createdByName: userProfile.name,
        updatedBy: userProfile.id,
        updatedByName: userProfile.name,
        companyId: userProfile.companyId,
        companyName: userProfile.companyName,
      };
      return await addDoc(this.collection, newDoc as any);
    } catch (error) {
      console.error(`Error adding document to ${this.collectionName}:`, error);
      this.notificationService.showError('Failed to save the new item.');
      throw error;
    }
  }

  async update(id: string, item: Partial<T>) {
    try {
      const userProfile = this.authService.currentUserProfile;
      if (!userProfile) throw new Error('User not logged in or profile not loaded');

      const docRef = doc(this.firestore, this.collectionName, id);
      const updatedDoc = {
        ...item,
        updatedAt: new Date(),
        updatedBy: userProfile.id,
        updatedByName: userProfile.name,
      };
      return await updateDoc(docRef, updatedDoc);
    } catch (error) {
      console.error(`Error updating document in ${this.collectionName}:`, error);
      this.notificationService.showError('Failed to update the item.');
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      return await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${this.collectionName}:`, error);
      this.notificationService.showError('Failed to delete the item.');
      throw error;
    }
  }
}
