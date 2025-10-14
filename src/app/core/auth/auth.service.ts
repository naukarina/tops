import { inject, Injectable } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { DocStatus } from '../../models/base-document.model';
import { UserProfile } from '../../models/user-profile.model';
import { CompanyService } from '../../services/company.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private companyService: CompanyService = inject(CompanyService);

  private userProfile$ = new BehaviorSubject<UserProfile | null>(null);
  public userProfileState$: Observable<UserProfile | null> = this.userProfile$.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        (docData(userDocRef, { idField: 'id' }) as Observable<UserProfile>)
          .pipe(
            switchMap((profile) => {
              if (profile && profile.companyId) {
                return this.companyService.get(profile.companyId).pipe(
                  map((company) => {
                    // Enrich the profile with both name and type from the company
                    return {
                      ...profile,
                      companyName: company ? company.name : '',
                      companyType: company ? company.type : undefined,
                    };
                  })
                );
              }
              return of(profile); // Return profile if no companyId
            })
          )
          .subscribe((enrichedProfile) => {
            this.userProfile$.next(enrichedProfile as UserProfile | null);
          });
      } else {
        this.userProfile$.next(null);
      }
    });
  }

  public get currentUserProfile(): UserProfile | null {
    return this.userProfile$.getValue();
  }

  public get currentUser(): User | null {
    return this.auth.currentUser;
  }

  isLoggedIn(): Observable<boolean> {
    return this.userProfile$.asObservable().pipe(map((user) => !!user));
  }

  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

  async register(email: string, pass: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, pass);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });

    const userDocRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userDocRef, {
      name: name,
      email: email,
      roles: ['user'],
      companyId: '', // Should be assigned later
      companyName: '', // Will be populated by the service
      documentStatus: DocStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.uid,
      createdByName: name,
      updatedBy: user.uid,
      updatedByName: name,
    });

    return userCredential;
  }
}
