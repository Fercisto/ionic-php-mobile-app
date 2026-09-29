import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private readonly onlineSubject = new BehaviorSubject<boolean>(this.readInitialStatus());
  readonly online$ = this.onlineSubject.asObservable().pipe(distinctUntilChanged());

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onlineSubject.next(true));
      window.addEventListener('offline', () => this.onlineSubject.next(false));
    }
  }

  get isOnline(): boolean {
    return this.onlineSubject.value;
  }

  private readInitialStatus(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }
}