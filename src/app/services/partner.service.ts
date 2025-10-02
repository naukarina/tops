// src/app/services/partner.service.ts
import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Partner } from '../models/partner.model';
import { DocumentStatus } from '../models/base-document.model';

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  private firestore = inject(Firestore);
  private partnersCollection = collection(this.firestore, 'partners');

  getPartners(): Observable<Partner[]> {
    return collectionData(this.partnersCollection, { idField: 'id' }) as Observable<Partner[]>;
  }

  getPartner(id: string) {
    const partnerDoc = doc(this.firestore, `partners/${id}`);
    return getDoc(partnerDoc);
  }

  addPartner(partner: Partner) {
    const newPartner = {
      ...partner,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: DocumentStatus.ACTIVE,
    };
    return addDoc(this.partnersCollection, newPartner);
  }

  updatePartner(id: string, partner: Partner) {
    const partnerDoc = doc(this.firestore, `partners/${id}`);
    const updatedPartner = {
      ...partner,
      updatedAt: new Date(),
    };
    return updateDoc(partnerDoc, updatedPartner);
  }
}
