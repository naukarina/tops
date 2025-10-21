import { inject, Injectable } from '@angular/core';
import { Auth, onAuthStateChanged, User, sendPasswordResetEmail } from '@angular/fire/auth';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UserProfile } from '../../models/user-profile.model';
import { CompanyService } from '../../services/company.service';
import { Company, CompanyType } from '../../models/company.model';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private companyService: CompanyService = inject(CompanyService);
  private functions: Functions = inject(Functions);

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

  forgotPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async createUser(
    email: string,
    name: string,
    companyId: string,
    companyName: string,
    companyType: CompanyType
  ) {
    const createUserFn = httpsCallable(this.functions, 'createUser');
    return await createUserFn({
      email,
      name,
      companyId,
      companyName,
      companyType,
    });
  }
}
