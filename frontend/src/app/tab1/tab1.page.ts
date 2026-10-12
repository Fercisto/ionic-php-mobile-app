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
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonProgressBar,
  IonSearchbar,
  AlertController,
  ToastController,
  NavController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  folderOpenOutline,
  addCircleOutline,
  refreshOutline,
  createOutline,
  trashOutline,
  closeOutline,
  peopleOutline,
  personAddOutline,
  personRemoveOutline,
  checkmarkCircleOutline,
  timeOutline,
  alertCircleOutline,
  calendarOutline,
  personOutline,
  checkboxOutline,
  listOutline,
  checkmarkDoneOutline,
  arrowForwardOutline,
  bluetoothOutline,
  sendOutline
} from 'ionicons/icons';
import { AuthService, UserProfile } from '../services/auth.service';
import {
  ProjectService,
  Project,
  ProjectMember,
  TaskItem,
  AvailableUser
} from '../services/project.service';
import { BluetoothService, NearbyDevice } from '../services/bluetooth.service';
import { UserService, UserItem } from '../services/user.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
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
    IonModal,
    IonRefresher,
    IonRefresherContent,
    IonProgressBar,
    IonSearchbar
  ],
})
export class Tab1Page implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private navCtrl = inject(NavController);
  private cdr = inject(ChangeDetectorRef);
  private bluetooth = inject(BluetoothService);
  private userService = inject(UserService);

  currentUser: UserProfile | null = null;
  projects: Project[] = [];
  isLoadingProjects: boolean = false;

  // Modal Proyecto (Crear / Editar)
  isProjectModalOpen: boolean = false;
  isEditingProject: boolean = false;
  projectForm = {
    id: 0,
    title: '',
    description: '',
    status: 'active' as 'active' | 'completed' | 'archived'
  };
  isSubmittingProject: boolean = false;

  // Modal Detalle de Proyecto
  isDetailModalOpen: boolean = false;
  selectedProject: Project | null = null;
  projectMembers: ProjectMember[] = [];
  projectTasks: TaskItem[] = [];
  isLoadingDetail: boolean = false;
  detailSegment: 'tasks' | 'members' = 'tasks';
  taskFilter: 'all' | 'pending' | 'in_progress' | 'completed' = 'all';

  // Modal Tarea (Crear / Editar)
  isTaskModalOpen: boolean = false;
  isEditingTask: boolean = false;
  taskForm = {
    id: 0,
    title: '',
    description: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to: null as number | null,
    due_date: ''
  };
  isSubmittingTask: boolean = false;

  // Modal Invitar Miembro
  isInviteModalOpen: boolean = false;
  availableUsers: AvailableUser[] = [];
  userSearchQuery: string = '';
  isLoadingUsers: boolean = false;

  // Invitar por Bluetooth (dentro del modal de invitación)
  nearbyUsers: NearbyUser[] = [];
  isScanningBluetooth: boolean = false;
  sendingToDeviceId: string | null = null;

  constructor() {
    addIcons({
      folderOpenOutline,
      addCircleOutline,
      refreshOutline,
      createOutline,
      trashOutline,
      closeOutline,
      peopleOutline,
      personAddOutline,
      personRemoveOutline,
      checkmarkCircleOutline,
      timeOutline,
      alertCircleOutline,
      calendarOutline,
      personOutline,
      checkboxOutline,
      listOutline,
      checkmarkDoneOutline,
      arrowForwardOutline,
      bluetoothOutline,
      sendOutline
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
    this.loadProjects();
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

  // =========================================================================
  // PROYECTOS
  // =========================================================================

  loadProjects(event?: CustomEvent): void {
    if (!this.currentUser) return;
    this.isLoadingProjects = true;
    this.cdr.detectChanges();

    this.projectService.getProjects(this.currentUser.id).subscribe({
      next: (res) => {
        this.isLoadingProjects = false;
        if (event) {
          (event.target as HTMLIonRefresherElement).complete();
        }
        if (res.success && Array.isArray(res.data)) {
          this.projects = res.data;
        } else {
          this.projects = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingProjects = false;
        if (event) {
          (event.target as HTMLIonRefresherElement).complete();
        }
        console.error('Error cargando proyectos:', err);
        this.cdr.detectChanges();
      }
    });
  }

  openCreateProjectModal(): void {
    this.isEditingProject = false;
    this.projectForm = {
      id: 0,
      title: '',
      description: '',
      status: 'active'
    };
    this.isProjectModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditProjectModal(project: Project, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditingProject = true;
    this.projectForm = {
      id: project.id,
      title: project.title,
      description: project.description || '',
      status: project.status
    };
    this.isProjectModalOpen = true;
    this.cdr.detectChanges();
  }

  closeProjectModal(): void {
    this.isProjectModalOpen = false;
    this.cdr.detectChanges();
  }

  onSaveProjectSubmit(): void {
    if (!this.currentUser) return;
    if (!this.projectForm.title.trim()) {
      this.presentToast('El título del proyecto es obligatorio.', 'warning');
      return;
    }

    this.isSubmittingProject = true;

    if (this.isEditingProject) {
      this.projectService.updateProject({
        id: this.projectForm.id,
        title: this.projectForm.title.trim(),
        description: this.projectForm.description.trim(),
        status: this.projectForm.status
      }).subscribe({
        next: (res) => {
          this.isSubmittingProject = false;
          if (res.success) {
            this.presentToast('Proyecto actualizado correctamente.', 'success');
            this.closeProjectModal();
            this.loadProjects();
            if (this.selectedProject && this.selectedProject.id === this.projectForm.id) {
              this.selectedProject.title = this.projectForm.title;
              this.selectedProject.description = this.projectForm.description;
              this.selectedProject.status = this.projectForm.status;
            }
          } else {
            this.presentToast(res.message || 'No se pudo actualizar el proyecto.', 'danger');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmittingProject = false;
          const msg = err.error?.message || 'Error al actualizar proyecto.';
          this.presentToast(msg, 'danger');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.projectService.createProject({
        title: this.projectForm.title.trim(),
        description: this.projectForm.description.trim(),
        owner_id: this.currentUser.id
      }).subscribe({
        next: (res) => {
          this.isSubmittingProject = false;
          if (res.success) {
            this.presentToast('Proyecto creado exitosamente.', 'success');
            this.closeProjectModal();
            this.loadProjects();
          } else {
            this.presentToast(res.message || 'No se pudo crear el proyecto.', 'danger');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmittingProject = false;
          const msg = err.error?.message || 'Error al conectar con la API.';
          this.presentToast(msg, 'danger');
          this.cdr.detectChanges();
        }
      });
    }
  }

  async confirmDeleteProject(project: Project, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Proyecto',
      message: `¿Estás seguro de que deseas eliminar "${project.title}"? Se borrarán todas sus tareas y miembros.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.executeDeleteProject(project.id);
          }
        }
      ]
    });
    await alert.present();
  }

  private executeDeleteProject(id: number): void {
    this.projectService.deleteProject(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.presentToast('Proyecto eliminado con éxito.', 'success');
          if (this.isDetailModalOpen && this.selectedProject?.id === id) {
            this.closeDetailModal();
          }
          this.loadProjects();
        } else {
          this.presentToast(res.message || 'Error al eliminar proyecto.', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al eliminar proyecto.';
        this.presentToast(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================================
  // DETALLE DE PROYECTO (TAREAS & MIEMBROS)
  // =========================================================================

  openProjectDetail(project: Project): void {
    this.selectedProject = project;
    this.detailSegment = 'tasks';
    this.taskFilter = 'all';
    this.isDetailModalOpen = true;
    this.loadProjectDetail(project.id);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen = false;
    this.selectedProject = null;
    this.projectMembers = [];
    this.projectTasks = [];
    this.loadProjects();
    this.cdr.detectChanges();
  }

  loadProjectDetail(projectId: number): void {
    this.isLoadingDetail = true;
    this.cdr.detectChanges();

    this.projectService.getProjectDetail(projectId).subscribe({
      next: (res) => {
        this.isLoadingDetail = false;
        if (res.success && res.data) {
          this.selectedProject = res.data.project;
          this.projectMembers = res.data.members || [];
          this.projectTasks = res.data.tasks || [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingDetail = false;
        console.error('Error cargando detalle:', err);
        this.presentToast('No se pudo cargar el detalle del proyecto.', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  get filteredTasks(): TaskItem[] {
    if (this.taskFilter === 'all') return this.projectTasks;
    return this.projectTasks.filter(t => t.status === this.taskFilter);
  }

  get isCurrentUserOwner(): boolean {
    if (!this.currentUser || !this.selectedProject) return false;
    return this.selectedProject.owner_id === this.currentUser.id;
  }

  get completedTasksCount(): number {
    return this.projectTasks.filter(t => t.status === 'completed').length;
  }

  get projectProgress(): number {
    if (this.projectTasks.length === 0) return 0;
    return this.completedTasksCount / this.projectTasks.length;
  }

  // =========================================================================
  // TAREAS
  // =========================================================================

  openCreateTaskModal(): void {
    this.isEditingTask = false;
    this.taskForm = {
      id: 0,
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      assigned_to: null,
      due_date: ''
    };
    this.isTaskModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditTaskModal(task: TaskItem): void {
    this.isEditingTask = true;
    this.taskForm = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to || null,
      due_date: task.due_date || ''
    };
    this.isTaskModalOpen = true;
    this.cdr.detectChanges();
  }

  closeTaskModal(): void {
    this.isTaskModalOpen = false;
    this.cdr.detectChanges();
  }

  onSaveTaskSubmit(): void {
    if (!this.selectedProject) return;
    if (!this.taskForm.title.trim()) {
      this.presentToast('El título de la tarea es obligatorio.', 'warning');
      return;
    }

    this.isSubmittingTask = true;

    if (this.isEditingTask) {
      this.projectService.updateTask({
        id: this.taskForm.id,
        title: this.taskForm.title.trim(),
        description: this.taskForm.description.trim(),
        status: this.taskForm.status,
        priority: this.taskForm.priority,
        assigned_to: this.taskForm.assigned_to ? Number(this.taskForm.assigned_to) : null,
        due_date: this.taskForm.due_date || null
      }).subscribe({
        next: (res) => {
          this.isSubmittingTask = false;
          if (res.success) {
            this.presentToast('Tarea actualizada correctamente.', 'success');
            this.closeTaskModal();
            this.loadProjectDetail(this.selectedProject!.id);
          } else {
            this.presentToast(res.message || 'No se pudo actualizar la tarea.', 'danger');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmittingTask = false;
          const msg = err.error?.message || 'Error al actualizar tarea.';
          this.presentToast(msg, 'danger');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.projectService.createTask({
        project_id: this.selectedProject.id,
        title: this.taskForm.title.trim(),
        description: this.taskForm.description.trim(),
        status: this.taskForm.status,
        priority: this.taskForm.priority,
        assigned_to: this.taskForm.assigned_to ? Number(this.taskForm.assigned_to) : null,
        due_date: this.taskForm.due_date || null
      }).subscribe({
        next: (res) => {
          this.isSubmittingTask = false;
          if (res.success) {
            this.presentToast('Tarea creada exitosamente.', 'success');
            this.closeTaskModal();
            this.loadProjectDetail(this.selectedProject!.id);
          } else {
            this.presentToast(res.message || 'No se pudo crear la tarea.', 'danger');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmittingTask = false;
          const msg = err.error?.message || 'Error al crear la tarea.';
          this.presentToast(msg, 'danger');
          this.cdr.detectChanges();
        }
      });
    }
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

  async confirmDeleteTask(task: TaskItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Tarea',
      message: `¿Deseas eliminar la tarea "${task.title}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.executeDeleteTask(task.id);
          }
        }
      ]
    });
    await alert.present();
  }

  private executeDeleteTask(taskId: number): void {
    if (!this.selectedProject) return;
    this.projectService.deleteTask(taskId).subscribe({
      next: (res) => {
        if (res.success) {
          this.presentToast('Tarea eliminada.', 'success');
          this.loadProjectDetail(this.selectedProject!.id);
        } else {
          this.presentToast(res.message || 'No se pudo eliminar la tarea.', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al eliminar tarea.';
        this.presentToast(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================================
  // MIEMBROS & INVITACIONES
  // =========================================================================

  openInviteModal(): void {
    if (!this.selectedProject) return;
    this.userSearchQuery = '';
    this.availableUsers = [];
    this.isInviteModalOpen = true;
    this.searchAvailableUsers();
  }

  closeInviteModal(): void {
    this.isInviteModalOpen = false;
    this.availableUsers = [];
    this.nearbyUsers = [];
    void this.bluetooth.stopScan();
    this.cdr.detectChanges();
  }

  searchAvailableUsers(): void {
    if (!this.selectedProject) return;
    this.isLoadingUsers = true;
    this.cdr.detectChanges();

    this.projectService.getAvailableUsers(this.selectedProject.id, this.userSearchQuery.trim()).subscribe({
      next: (res) => {
        this.isLoadingUsers = false;
        if (res.success && Array.isArray(res.data)) {
          this.availableUsers = res.data;
        } else {
          this.availableUsers = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingUsers = false;
        console.error('Error buscando usuarios:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange(event: CustomEvent): void {
    this.userSearchQuery = event.detail.value || '';
    this.searchAvailableUsers();
  }

  addMemberToProject(user: AvailableUser): void {
    if (!this.selectedProject) return;

    this.projectService.addMember(this.selectedProject.id, user.id, 'member').subscribe({
      next: (res) => {
        if (res.success) {
          this.presentToast(`¡${user.username} agregado al equipo!`, 'success');
          // Remover de la lista disponible
          this.availableUsers = this.availableUsers.filter(u => u.id !== user.id);
          this.loadProjectDetail(this.selectedProject!.id);
        } else {
          this.presentToast(res.message || 'No se pudo agregar al miembro.', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al agregar miembro.';
        this.presentToast(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================================
  // INVITAR POR BLUETOOTH
  // =========================================================================

  get canUseBluetooth(): boolean {
    return this.bluetooth.isSupported;
  }

  async scanNearbyUsers(): Promise<void> {
    if (!this.selectedProject || this.isScanningBluetooth) return;
    this.nearbyUsers = [];
    this.isScanningBluetooth = true;
    this.cdr.detectChanges();

    // Los teléfonos cercanos solo anuncian el ID del usuario; el nombre se busca en la lista de usuarios.
    const users = await lastValueFrom(this.userService.getUsers())
      .then(res => res.data ?? [])
      .catch(() => [] as UserItem[]);

    try {
      await this.bluetooth.scanNearby(device => this.addNearbyUser(device, users));
    } catch (error) {
      this.presentToast((error as Error).message || 'No se pudo buscar por Bluetooth.', 'danger');
    } finally {
      this.isScanningBluetooth = false;
      this.cdr.detectChanges();
    }
  }

  private addNearbyUser(device: NearbyDevice, users: UserItem[]): void {
    if (device.userId === this.currentUser?.id) return;
    if (this.nearbyUsers.some(u => u.deviceId === device.deviceId)) return;

    const user = users.find(u => u.id === device.userId);
    this.nearbyUsers.push({
      ...device,
      username: user?.username ?? `Usuario #${device.userId}`,
      email: user?.email ?? '',
      isMember: this.projectMembers.some(m => m.user_id === device.userId),
      invited: false
    });
    this.cdr.detectChanges();
  }

  async sendBluetoothInvite(nearby: NearbyUser): Promise<void> {
    if (!this.selectedProject || !this.currentUser || this.sendingToDeviceId) return;
    this.sendingToDeviceId = nearby.deviceId;
    this.cdr.detectChanges();

    try {
      await this.bluetooth.sendInvitation(nearby.deviceId, {
        type: 'project_invite',
        project_id: this.selectedProject.id,
        project_title: this.selectedProject.title,
        from_user_id: this.currentUser.id,
        from_username: this.currentUser.username
      });
      nearby.invited = true;
      this.presentToast(`Invitación enviada a ${nearby.username}.`, 'success');
    } catch (error) {
      this.presentToast((error as Error).message || 'No se pudo enviar la invitación.', 'danger');
    } finally {
      this.sendingToDeviceId = null;
      this.cdr.detectChanges();
    }
  }

  async confirmRemoveMember(member: ProjectMember): Promise<void> {
    if (!this.selectedProject) return;
    if (member.role === 'owner') {
      this.presentToast('No se puede remover al líder del proyecto.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Remover Miembro',
      message: `¿Remover a "${member.username}" del equipo del proyecto? Sus tareas asignadas quedarán sin asignar.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          handler: () => {
            this.executeRemoveMember(member.user_id);
          }
        }
      ]
    });
    await alert.present();
  }

  private executeRemoveMember(userId: number): void {
    if (!this.selectedProject) return;
    this.projectService.removeMember(this.selectedProject.id, userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.presentToast('Miembro removido del proyecto.', 'success');
          this.loadProjectDetail(this.selectedProject!.id);
        } else {
          this.presentToast(res.message || 'No se pudo remover el miembro.', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al remover miembro.';
        this.presentToast(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

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

  calculateProjectProgress(project: Project): number {
    const total = project.tasks_count || 0;
    if (total === 0) return 0;
    return (project.completed_tasks_count || 0) / total;
  }
}

interface NearbyUser extends NearbyDevice {
  username: string;
  email: string;
  isMember: boolean;
  invited: boolean;
}
