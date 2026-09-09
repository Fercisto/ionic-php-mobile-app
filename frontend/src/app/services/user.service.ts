import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  // Base URL a la carpeta /backend/api
  private baseUrl = environment.apiUrl.replace(/\/auth$/, '') + '/users';

  /**
   * Obtener todos los usuarios de la base de datos
   */
  getUsers(): Observable<ApiResponse<UserItem[]>> {
    return this.http.get<ApiResponse<UserItem[]>>(`${this.baseUrl}/list.php`);
  }

  /**
   * Crear un nuevo usuario
   */
  createUser(userData: { username: string; email: string; password: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/create.php`, userData);
  }

  /**
   * Actualizar un usuario existente
   */
  updateUser(userData: { id: number; username: string; email: string; password?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/update.php`, userData);
  }

  /**
   * Eliminar un usuario por su ID
   */
  deleteUser(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/delete.php`, { id });
  }
}
