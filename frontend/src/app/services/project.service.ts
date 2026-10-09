import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { NetworkService } from './network.service';

export interface Project {
  id: number;
  title: string;
  description?: string | null;
  owner_id: number;
  status: 'active' | 'completed' | 'archived';
  created_at?: string;
  updated_at?: string;
  owner_username?: string;
  owner_email?: string;
  current_user_role?: 'owner' | 'member';
  members_count?: number;
  tasks_count?: number;
  completed_tasks_count?: number;
}

export interface ProjectMember {
  member_id: number;
  project_id: number;
  user_id: number;
  role: 'owner' | 'member';
  joined_at: string;
  username: string;
  email: string;
}

export interface TaskItem {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to?: number | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  assigned_username?: string | null;
  assigned_email?: string | null;
  project_title?: string;
}

export interface AvailableUser {
  id: number;
  username: string;
  email: string;
}

export interface ProjectDetailResponse {
  project: Project;
  members: ProjectMember[];
  tasks: TaskItem[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  project?: Project;
  task?: TaskItem;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private network = inject(NetworkService);

  private apiBase = environment.apiUrl.replace(/\/auth\/?$/, '');

  // -------------------------------------------------------------
  // PROYECTOS
  // -------------------------------------------------------------

  getProjects(userId: number): Observable<ApiResponse<Project[]>> {
    return this.request(this.http.get<ApiResponse<Project[]>>(`${this.apiBase}/projects/list.php?user_id=${userId}`));
  }

  getProjectDetail(projectId: number): Observable<ApiResponse<ProjectDetailResponse>> {
    return this.request(this.http.get<ApiResponse<ProjectDetailResponse>>(`${this.apiBase}/projects/get.php?id=${projectId}`));
  }

  createProject(data: { title: string; description?: string; owner_id: number }): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.apiBase}/projects/create.php`, data));
  }

  updateProject(data: { id: number; title: string; description?: string; status: 'active' | 'completed' | 'archived' }): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.apiBase}/projects/update.php`, data));
  }

  deleteProject(id: number): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.apiBase}/projects/delete.php`, { id }));
  }

  // -------------------------------------------------------------
  // MIEMBROS & INVITACIONES
  // -------------------------------------------------------------

  getMembers(projectId: number): Observable<ApiResponse<ProjectMember[]>> {
    return this.request(this.http.get<ApiResponse<ProjectMember[]>>(`${this.apiBase}/members/list.php?project_id=${projectId}`));
  }

  getAvailableUsers(projectId: number, search: string = ''): Observable<ApiResponse<AvailableUser[]>> {
    const url = `${this.apiBase}/members/available.php?project_id=${projectId}&search=${encodeURIComponent(search)}`;
    return this.request(this.http.get<ApiResponse<AvailableUser[]>>(url));
  }

  addMember(projectId: number, userId: number, role: 'owner' | 'member' = 'member'): Observable<ApiResponse<ProjectMember[]>> {
    return this.request(this.http.post<ApiResponse<ProjectMember[]>>(`${this.apiBase}/members/add.php`, {
      project_id: projectId,
      user_id: userId,
      role
    }));
  }

  removeMember(projectId: number, userId: number): Observable<ApiResponse<ProjectMember[]>> {
    return this.request(this.http.post<ApiResponse<ProjectMember[]>>(`${this.apiBase}/members/remove.php`, {
      project_id: projectId,
      user_id: userId
    }));
  }

  // -------------------------------------------------------------
  // TAREAS
  // -------------------------------------------------------------

  getProjectTasks(projectId: number): Observable<ApiResponse<TaskItem[]>> {
    return this.request(this.http.get<ApiResponse<TaskItem[]>>(`${this.apiBase}/tasks/list.php?project_id=${projectId}`));
  }

  getMyTasks(userId: number): Observable<ApiResponse<TaskItem[]>> {
    return this.request(this.http.get<ApiResponse<TaskItem[]>>(`${this.apiBase}/tasks/list.php?user_id=${userId}`));
  }

  createTask(task: {
    project_id: number;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    assigned_to?: number | null;
    due_date?: string | null;
  }): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.apiBase}/tasks/create.php`, task));
  }

  updateTask(task: {
    id: number;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    assigned_to?: number | null;
    due_date?: string | null;
  }): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.apiBase}/tasks/update.php`, task));
  }

  updateTaskStatus(taskId: number, status: 'pending' | 'in_progress' | 'completed'): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.apiBase}/tasks/status.php`, { id: taskId, status }));
  }

  deleteTask(taskId: number): Observable<ApiResponse> {
    return this.request(this.http.post<ApiResponse>(`${this.apiBase}/tasks/delete.php`, { id: taskId }));
  }

  // -------------------------------------------------------------
  // ERROR & NETWORK HANDLING
  // -------------------------------------------------------------

  private request<T>(request$: Observable<T>): Observable<T> {
    if (!this.network.isOnline) {
      return throwError(() => this.connectionError());
    }

    return request$.pipe(
      catchError((error: HttpErrorResponse) => throwError(() => this.withMessage(
        error,
        'No fue posible comunicarse con el servidor.'
      )))
    );
  }

  private connectionError(): HttpErrorResponse {
    return new HttpErrorResponse({
      status: 0,
      error: { message: 'Sin conexión a Internet. Verifica tu red e inténtalo de nuevo.' }
    });
  }

  private withMessage(error: HttpErrorResponse, fallback: string): HttpErrorResponse {
    const message = error.error?.message || (error.status === 0
      ? 'No hay conexión a Internet. Verifica tu red e inténtalo de nuevo.'
      : fallback);
    return new HttpErrorResponse({
      error: { ...(error.error || {}), message },
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url || undefined
    });
  }
}

