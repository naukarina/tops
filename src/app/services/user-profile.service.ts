// src/app/services/user-profile.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { doc, docData, Firestore, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UserProfile } from '../models/user-profile.model';
import { CompanyService } from './company.service';
import { Company } from '../models/company.model';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private companyService: CompanyService = inject(CompanyService); // Inject CompanyService

  private userProfileSignal = signal<UserProfile | null>(null);

  user$ = user(this.auth);

  userProfile$ = this.user$.pipe(
    switchMap((user) => {
      if (user) {
        return docData(doc(this.firestore, `users/${user.uid}`), {
          idField: 'id',
        }) as Observable<UserProfile>;
      } else {
        return of(null);
      }
    })
  );

  /**
   * ADDITION 1: An observable stream of the current user's full company data.
   * This combines the user profile with their company document.
   */
  userCompany$: Observable<Company | null> = this.userProfile$.pipe(
    switchMap((profile) => {
      if (profile && profile.companyId) {
        return this.companyService.get(profile.companyId);
      }
      return of(null);
    })
  );

  /**
   * ADDITION 2: A convenient stream for just the sub-DMCs.
   * This is useful for populating dropdowns, like in the partner form.
   */
  userSubDmcs$: Observable<string[]> = this.userCompany$.pipe(
    map((company) => company?.subDmcs || [])
  );

  constructor() {
    this.userProfile$.subscribe((profile) => {
      this.userProfileSignal.set(profile);
    });
  }

  get currentUserProfile$(): Observable<UserProfile | null> {
    return this.userProfile$;
  }

  get currentUserProfileSignal() {
    return this.userProfileSignal;
  }

  async addUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await setDoc(userDocRef, profileData);
  }

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    await updateDoc(userDocRef, profileData);
  }
}
