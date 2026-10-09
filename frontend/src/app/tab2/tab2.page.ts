import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  ToastController,
  NavController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkboxOutline,
  refreshOutline,
  timeOutline,
  checkmarkCircleOutline,
  ellipseOutline,
  calendarOutline,
  folderOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { AuthService, UserProfile } from '../services/auth.service';
import { ProjectService, TaskItem } from '../services/project.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent
  ],
})
export class Tab2Page implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private toastCtrl = inject(ToastController);
  private navCtrl = inject(NavController);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserProfile | null = null;
  myTasks: TaskItem[] = [];
  isLoading: boolean = false;
  activeFilter: 'all' | 'pending' | 'in_progress' | 'completed' = 'all';

  constructor() {
    addIcons({
      checkboxOutline,
      refreshOutline,
      timeOutline,
      checkmarkCircleOutline,
      ellipseOutline,
      calendarOutline,
      folderOutline,
      alertCircleOutline
    });
  }

  ngOnInit(): void {
    this.checkSessionAndLoad();
  }

  ionViewWillEnter(): void {
    this.checkSessionAndLoad();
  }

  private checkSessionAndLoad(): void {
    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.navCtrl.navigateRoot('/login');
      return;
    }
    this.loadMyTasks();
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  loadMyTasks(event?: CustomEvent): void {
    if (!this.currentUser) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    this.projectService.getMyTasks(this.currentUser.id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (event) {
          (event.target as HTMLIonRefresherElement).complete();
        }
        if (res.success && Array.isArray(res.data)) {
          this.myTasks = res.data;
        } else {
          this.myTasks = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        if (event) {
          (event.target as HTMLIonRefresherElement).complete();
        }
        console.error('Error cargando mis tareas:', err);
        this.cdr.detectChanges();
      }
    });
  }

  get filteredTasks(): TaskItem[] {
    if (this.activeFilter === 'all') return this.myTasks;
    return this.myTasks.filter(t => t.status === this.activeFilter);
  }

  get pendingCount(): number {
    return this.myTasks.filter(t => t.status === 'pending').length;
  }

  get inProgressCount(): number {
    return this.myTasks.filter(t => t.status === 'in_progress').length;
  }

  get completedCount(): number {
    return this.myTasks.filter(t => t.status === 'completed').length;
  }

  toggleTaskStatus(task: TaskItem): void {
    const nextStatus: Record<'pending' | 'in_progress' | 'completed', 'pending' | 'in_progress' | 'completed'> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending'
    };
    const targetStatus = nextStatus[task.status];

    this.projectService.updateTaskStatus(task.id, targetStatus).subscribe({
      next: (res) => {
        if (res.success) {
          task.status = targetStatus;
          this.presentToast(`Tarea marcada como ${this.getStatusLabel(targetStatus)}.`, 'success');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al actualizar estado.';
        this.presentToast(msg, 'danger');
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En curso';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  }
}
