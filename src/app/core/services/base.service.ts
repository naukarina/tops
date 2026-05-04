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
  setDoc,
} from '@angular/fire/firestore';
import { Observable, of, from, defer } from 'rxjs';
import { finalize, switchMap, tap } from 'rxjs/operators';
import { BaseDocument, DocStatus } from '../models/base-document.model';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../auth/auth.service';
import { CompanyType } from '../models/company.model';
import { LoadingService } from './loading.service';

@Injectable({
  providedIn: 'root',
})
export abstract class BaseService<T extends BaseDocument> {
  protected collection;

  protected firestore: Firestore = inject(Firestore);
  protected notificationService: NotificationService = inject(NotificationService);
  protected authService: AuthService = inject(AuthService);
  protected loadingService = inject(LoadingService);

  constructor(protected collectionName: string) {
    this.collection = collection(this.firestore, this.collectionName);
  }

  getAll(): Observable<T[]> {
    // defer() ensures the setup logic runs only when a component subscribes
    return defer(() => {
      this.loadingService.show();
      let initialLoad = true;

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
              where('planningCompanyId', '==', userProfile.companyId),
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
              }),
            );
          } else {
            // For all other company types, fetch docs for their own companyId.
            const q = query(this.collection, where('companyId', '==', userProfile.companyId));
            return collectionData(q, { idField: 'id' }) as Observable<T[]>;
          }
        }),
        // Apply the loading logic to the final merged stream
        tap({
          next: () => {
            if (initialLoad) {
              this.loadingService.hide();
              initialLoad = false;
            }
          },
          error: () => {
            if (initialLoad) {
              this.loadingService.hide();
              initialLoad = false;
            }
          },
        }),
        finalize(() => {
          // Safety net: hides the spinner if the component is destroyed before data loads
          if (initialLoad) {
            this.loadingService.hide();
          }
        }),
      );
    });
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
        createdByName: userProfile.displayName,
        updatedBy: userProfile.id,
        updatedByName: userProfile.displayName,
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
        updatedByName: userProfile.displayName,
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

  async set(id: string, data: Partial<T>): Promise<void> {
    try {
      const userProfile = this.authService.currentUserProfile;
      if (!userProfile) throw new Error('User not logged in or profile not loaded');

      const documentRef = doc(this.firestore, `${this.collectionName}/${id}`);

      const newDoc = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        documentStatus: DocStatus.ACTIVE,
        createdBy: userProfile.id,
        createdByName: userProfile.displayName,
        updatedBy: userProfile.id,
        updatedByName: userProfile.displayName,
        companyId: userProfile.companyId,
        companyName: userProfile.companyName,
      };
      return await await setDoc(documentRef, newDoc, { merge: true });
    } catch (error) {
      console.error(`Error adding document to ${this.collectionName}:`, error);
      this.notificationService.showError('Failed to save the new item.');
      throw error;
    }
  }
}
