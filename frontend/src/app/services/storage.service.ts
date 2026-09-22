import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  setSync<T>(key: string, value: T): void {
    try {
      const payload = JSON.stringify(value);
      void Preferences.set({ key, value: payload }).catch(() => this.setLocal(key, payload));
    } catch {
      return;
    }
  }

  private getLocal<T>(key: string): T | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(key);
        if (item) {
          return JSON.parse(item) as T;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  getSync<T>(key: string): T | null {
    return this.getLocal<T>(key);
  }

  private setLocal(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const payload = JSON.stringify(value);
    this.setLocal(key, payload);

    try {
      await Preferences.set({ key, value: payload });
    } catch {
      // localStorage already contains the fallback value.
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      if (!value) {
        return this.getLocal<T>(key);
      }
      return JSON.parse(value) as T;
    } catch {
      return this.getLocal<T>(key);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      await Preferences.remove({ key });
    } catch {
      // Ignore storage errors in unsupported environments.
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      await Preferences.clear();
    } catch {
      // Ignore storage errors in unsupported environments.
    }
  }
}
