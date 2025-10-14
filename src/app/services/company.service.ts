import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Company } from '../models/company.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private firestore: Firestore = inject(Firestore);

  // Get a single company document as an Observable
  get(id: string): Observable<Company> {
    const companyDocRef = doc(this.firestore, `companies/${id}`);
    return docData(companyDocRef, { idField: 'id' }) as Observable<Company>;
  }
}
