import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  setDoc,
  addDoc,
  docData,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Partner } from '../models/partner.model';

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  constructor(private firestore: Firestore) {}

  getPartners(): Observable<Partner[]> {
    const partnersCollection = collection(this.firestore, 'partners');
    return collectionData(partnersCollection, { idField: 'id' }) as Observable<Partner[]>;
  }

  getPartner(id: string): Observable<Partner> {
    const partnerDoc = doc(this.firestore, `partners/${id}`);
    return docData(partnerDoc, { idField: 'id' }) as Observable<Partner>;
  }

  addPartner(partner: Omit<Partner, 'id'>): Promise<any> {
    const partnersCollection = collection(this.firestore, 'partners');
    return addDoc(partnersCollection, partner);
  }

  updatePartner(id: string, partner: Partial<Partner>): Promise<void> {
    const partnerDoc = doc(this.firestore, `partners/${id}`);
    return setDoc(partnerDoc, partner, { merge: true });
  }
}
