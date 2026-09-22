import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

export interface UserItem {
  id: number;
  username: string;
  email: string;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  user?: UserItem;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private readonly USERS_CACHE_KEY = 'users_cache';
  // Base URL a la carpeta /backend/api
  private baseUrl = environment.apiUrl.replace(/\/auth$/, '') + '/users';

  /**
   * Obtener todos los usuarios. Primero intenta mostrar caché persistente,
   * y luego consulta el backend para mantener datos actualizados.
   */
  getUsers(): Observable<ApiResponse<UserItem[]>> {
    return new Observable((observer) => {
      this.storage.get<UserItem[]>(this.USERS_CACHE_KEY).then((cachedUsers) => {
        const users = cachedUsers ?? [];
      if (users.length > 0) {
        observer.next({
          success: true,
          message: 'Usuarios cargados desde almacenamiento local.',
          data: users,
        });
      }

      this.http.get<ApiResponse<UserItem[]>>(`${this.baseUrl}/list.php`).subscribe({
        next: (res) => {
          if (res && res.success && Array.isArray(res.data)) {
            void this.storage.set(this.USERS_CACHE_KEY, res.data);
            observer.next(res);
          } else if (users.length > 0) {
            observer.next({
              success: true,
              message: 'Se usó la última copia guardada localmente.',
              data: users,
            });
          }
          observer.complete();
        },
        error: (err) => {
          if (users.length > 0) {
            observer.next({
              success: true,
              message: 'Sin conexión. Se mostraron los datos guardados localmente.',
              data: users,
            });
            observer.complete();
            return;
          }
          observer.error(err);
        }
      });
      });
    });
  }

  private async updateCachedUsers(update: (users: UserItem[]) => UserItem[]): Promise<void> {
    const currentUsers = await this.storage.get<UserItem[]>(this.USERS_CACHE_KEY) ?? [];
    await this.storage.set(this.USERS_CACHE_KEY, update(currentUsers));
  }

  /**
   * Crear un nuevo usuario
   */
  createUser(userData: { username: string; email: string; password: string }): Observable<ApiResponse> {
    return new Observable((observer) => {
      this.http.post<ApiResponse>(`${this.baseUrl}/create.php`, userData).subscribe({
        next: (res) => {
          if (res.success) {
            const createdUsers = res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : [];
            void this.updateCachedUsers((currentUsers) => [...currentUsers, ...createdUsers]);
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Actualizar un usuario existente
   */
  updateUser(userData: { id: number; username: string; email: string; password?: string }): Observable<ApiResponse> {
    return new Observable((observer) => {
      this.http.post<ApiResponse>(`${this.baseUrl}/update.php`, userData).subscribe({
        next: (res) => {
          if (res.success) {
            void this.updateCachedUsers((currentUsers) => currentUsers.map((user) => user.id === userData.id
              ? { ...user, username: userData.username, email: userData.email }
              : user));
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Eliminar un usuario por su ID
   */
  deleteUser(id: number): Observable<ApiResponse> {
    return new Observable((observer) => {
      this.http.post<ApiResponse>(`${this.baseUrl}/delete.php`, { id }).subscribe({
        next: (res) => {
          if (res.success) {
            void this.updateCachedUsers((currentUsers) => currentUsers.filter((user) => user.id !== id));
          }
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }
}
