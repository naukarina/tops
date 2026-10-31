import { Injectable, signal } from '@angular/core';

export type KreolaEnv = 'prod' | 'dev';

const STORAGE_KEY = 'kreolaEnv';

// Which Kreola API (prod or dev) the internal accommodation tools talk to.
// Sent with every proxy call; the Cloud Functions pick the URL and credentials from it.
@Injectable({ providedIn: 'root' })
export class KreolaEnvService {
  readonly env = signal<KreolaEnv>(this.read());

  set(env: KreolaEnv) {
    this.env.set(env);
    try {
      localStorage.setItem(STORAGE_KEY, env);
    } catch {
      // storage unavailable (private mode etc.): the choice just lasts for this session
    }
  }

  private read(): KreolaEnv {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dev' ? 'dev' : 'prod';
    } catch {
      return 'prod';
    }
  }
}
