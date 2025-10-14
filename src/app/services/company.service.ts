import { inject, Injectable } from '@angular/core';
import { Firestore, collection, doc, docData, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Company } from '../models/company.model';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
// By removing "extends BaseService<Company>", we break the circular dependency.
export class CompanyService {
  private firestore: Firestore = inject(Firestore);
  private collection;

  constructor() {
    this.collection = collection(this.firestore, 'companies');
  }

  // Provide a simple getAll method for companies.
  getAll(): Observable<Company[]> {
    return collectionData(this.collection, { idField: 'id' }) as Observable<Company[]>;
  }

  // The get method remains the same.
  get(id: string): Observable<Company> {
    const docRef = doc(this.firestore, `companies/${id}`);
    return docData(docRef, { idField: 'id' }) as Observable<Company>;
  }
}
