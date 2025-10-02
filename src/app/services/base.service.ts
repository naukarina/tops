// src/app/services/base.service.ts

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
import { Observable } from 'rxjs';
import { BaseDocument, DocStatus } from '../models/base-document.model';
import { AuthService } from '../core/auth/auth.service';

export class BaseService<T extends BaseDocument> {
  protected firestore = inject(Firestore);
  protected authService = inject(AuthService);
  protected collection: CollectionReference<DocumentData>;

  constructor(collectionName: string) {
    this.collection = collection(this.firestore, collectionName);
  }

  getAll(): Observable<T[]> {
    return collectionData(this.collection, { idField: 'id' }) as Observable<T[]>;
  }

  get(id: string) {
    const docRef = doc(this.firestore, `${this.collection.path}/${id}`);
    return getDoc(docRef);
  }

  async add(item: T) {
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
    return addDoc(this.collection, newDoc);
  }

  async update(id: string, item: Partial<T>) {
    const user = this.authService.currentUser;
    const docRef = doc(this.firestore, `${this.collection.path}/${id}`);
    const updatedDoc: { [key: string]: any } = {
      ...item,
      updatedAt: new Date(),
      updatedBy: user?.uid || '',
      updatedByName: user?.displayName || '',
    };
    return updateDoc(docRef, updatedDoc);
  }
}
