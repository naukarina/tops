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
import { Company, CompanyType } from '../../models/company.model';

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
                  map((company: Company) => {
                    return {
                      ...profile,
                      companyName: company ? company.name : '',
                      companyType: company ? company.type : undefined,
                    };
                  })
                );
              }
              return of(profile);
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

  /**
   * Creates a new Firebase Auth user and their corresponding Firestore profile.
   * NOTE: This is a client-side implementation. Creating users on the client
   * automatically signs them in, which signs the current admin out. This method
   * handles that by signing the admin back in, but it requires the admin's password.
   * For a production environment, a Cloud Function using the Admin SDK is the
   * recommended approach as it does not have this limitation.
   */
  async createUser(
    email: string,
    name: string,
    companyId: string,
    companyName: string,
    companyType: CompanyType
  ) {
    const admin = this.currentUser;
    if (!admin || !admin.email) throw new Error('Admin user not logged in.');

    const adminEmail = admin.email;
    const tempPassword = 'asdf1234'; // Default password for the new user

    // 1. Create the new user's authentication account
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, tempPassword);
    const newUser = userCredential.user;
    await updateProfile(newUser, { displayName: name });

    // 2. Create the Firestore profile document for the new user
    const userDocRef = doc(this.firestore, 'users', newUser.uid);
    await setDoc(userDocRef, {
      name: name,
      email: email,
      roles: ['user'],
      companyId: companyId,
      companyName: companyName,
      companyType: companyType,
      documentStatus: DocStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: admin.uid,
      createdByName: admin.displayName || 'Admin',
      updatedBy: admin.uid,
      updatedByName: admin.displayName || 'Admin',
    });

    // 3. IMPORTANT: Sign the admin back in to restore their session.
    const adminPassword = prompt(
      `User ${email} created successfully. Please re-enter your password to continue your session.`
    );
    if (adminPassword) {
      await signInWithEmailAndPassword(this.auth, adminEmail, adminPassword);
    } else {
      // If the admin fails to re-enter password, log them out for security.
      await this.logout();
      throw new Error('Password not provided. You have been logged out for security.');
    }

    return userCredential;
  }
}
