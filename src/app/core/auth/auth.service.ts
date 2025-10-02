// src/app/core/auth/auth.service.ts

import { inject, Injectable } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DocStatus } from '../../models/base-document.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private user$ = new BehaviorSubject<User | null>(null);

  // Expose the user state as a public observable
  public userState$: Observable<User | null> = this.user$.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user$.next(user);
    });
  }

  public get currentUser(): User | null {
    return this.user$.getValue();
  }

  isLoggedIn(): Observable<boolean> {
    return this.user$.asObservable().pipe(map((user) => !!user));
  }

  login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

  async register(email: string, pass: string, name: string) {
    // 1. Create the Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, pass);
    const user = userCredential.user;

    // 2. Update the Firebase Auth user's profile with their name
    await updateProfile(user, { displayName: name });

    // 3. Create the corresponding UserProfile document in Firestore
    const userProfilesCollection = collection(this.firestore, 'user-profiles');
    await addDoc(userProfilesCollection, {
      name: name,
      email: email,
      roles: ['user'], // Assign a default role
      // BaseDocument fields
      status: DocStatus.ACTIVE,
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
