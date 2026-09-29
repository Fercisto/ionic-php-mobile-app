import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, EMPTY, catchError, concat, defer, from, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { NetworkService } from './network.service';

export interface UserItem {
  id: number;
  username: string;
  email: string;
  created_at?: string;
}

export interface ApiResponse<T = unknown> {
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
  private network = inject(NetworkService);
  private readonly USERS_CACHE_KEY = 'users_cache';
  // Base URL a la carpeta /backend/api
  private baseUrl = environment.apiUrl.replace(/\/auth$/, '') + '/users';

  /**
   * Obtener todos los usuarios. Primero intenta mostrar caché persistente,
   * y luego consulta el backend para mantener datos actualizados.
   */
  getUsers(): Observable<ApiResponse<UserItem[]>> {
    return defer(() => from(this.storage.get<UserItem[]>(this.USERS_CACHE_KEY))).pipe(
      switchMap((cachedUsers) => {
        const users = cachedUsers ?? [];
        const cachedResponse = users.length > 0 ? of({
          success: true,
          message: 'Usuarios cargados desde almacenamiento local.',
          data: users
        }) : EMPTY;

        if (!this.network.isOnline) {
          return users.length > 0 ? cachedResponse : throwError(() => this.connectionError());
        }

        const remoteResponse = this.http.get<ApiResponse<UserItem[]>>(`${this.baseUrl}/list.php`).pipe(
          tap((response) => {
            if (response.success && Array.isArray(response.data)) {
              void this.storage.set(this.USERS_CACHE_KEY, response.data);
            }
          }),
          catchError((error: HttpErrorResponse) => users.length > 0
            ? of({ success: true, message: 'No se pudo actualizar. Se mostraron los datos guardados.', data: users })
            : throwError(() => this.withMessage(error, 'No fue posible cargar los usuarios.')))
        );

        return concat(cachedResponse, remoteResponse);
      })
    );
  }

  private async updateCachedUsers(update: (users: UserItem[]) => UserItem[]): Promise<void> {
    const currentUsers = await this.storage.get<UserItem[]>(this.USERS_CACHE_KEY) ?? [];
    await this.storage.set(this.USERS_CACHE_KEY, update(currentUsers));
  }

  /**
   * Crear un nuevo usuario
   */
  createUser(userData: { username: string; email: string; password: string }): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.baseUrl}/create.php`, userData)).pipe(
      tap((response) => {
        if (response.success && response.user) {
          void this.updateCachedUsers((users) => [...users, response.user!]);
        }
      })
    );
  }

  /**
   * Actualizar un usuario existente
   */
  updateUser(userData: { id: number; username: string; email: string; password?: string }): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.baseUrl}/update.php`, userData)).pipe(
      tap((response) => {
        if (response.success && response.user) {
          void this.updateCachedUsers((users) => users.map((user) => user.id === response.user!.id
            ? { ...user, ...response.user }
            : user));
        }
      })
    );
  }

  /**
   * Eliminar un usuario por su ID
   */
  deleteUser(id: number): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.baseUrl}/delete.php`, { id })).pipe(
      tap((response) => {
        if (response.success) {
          void this.updateCachedUsers((users) => users.filter((user) => user.id !== id));
        }
      })
    );
  }

  private request<T>(request$: Observable<T>): Observable<T> {
    if (!this.network.isOnline) {
      return throwError(() => this.connectionError());
    }

    return request$.pipe(
      catchError((error: HttpErrorResponse) => throwError(() => this.withMessage(
        error,
        'No fue posible completar la operación.'
      )))
    );
  }

  private connectionError(): HttpErrorResponse {
    return new HttpErrorResponse({
      status: 0,
      error: { message: 'Sin conexión. La operación requiere acceso al servidor.' }
    });
  }

  private withMessage(error: HttpErrorResponse, fallback: string): HttpErrorResponse {
    const message = error.error?.message || (error.status === 0 ?
      'No hay conexión a Internet. Verifica tu red e inténtalo de nuevo.' : fallback);
    return new HttpErrorResponse({
      error: { ...(error.error || {}), message },
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url || undefined
    });
  }
}
