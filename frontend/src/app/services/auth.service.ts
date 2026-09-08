import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private USER_KEY = 'auth_user_session';

  /**
   * Enviar datos de registro a PHP
   */
  register(userData: { username: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register.php`, userData);
  }

  /**
   * Enviar credenciales de inicio de sesión a PHP
   */
  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login.php`, credentials);
  }

  /**
   * Guardar la sesión del usuario en localStorage
   */
  saveSession(user: UserProfile): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Obtener el usuario autenticado actual
   */
  getUser(): UserProfile | null {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Comprobar si hay un usuario autenticado
   */
  isLoggedIn(): boolean {
    return this.getUser() !== null;
  }

  /**
   * Cerrar sesión y limpiar almacenamiento local
   */
  logout(): void {
    localStorage.removeItem(this.USER_KEY);
  }
}
