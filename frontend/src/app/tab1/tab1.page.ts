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
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personAddOutline,
  personOutline,
  mailOutline,
  lockClosedOutline,
  addCircleOutline,
  refreshOutline,
  peopleOutline,
  createOutline,
  trashOutline,
  closeOutline
} from 'ionicons/icons';
import { UserService, UserItem } from '../services/user.service';

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
    IonModal
  ],
})
export class Tab1Page implements OnInit {
  private userService = inject(UserService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  users: UserItem[] = [];
  isLoadingList: boolean = false;
  isSubmitting: boolean = false;

  // Modales
  isCreateModalOpen: boolean = false;
  isEditModalOpen: boolean = false;
  selectedUser: UserItem | null = null;

  // Formulario para crear
  createForm = {
    username: '',
    email: '',
    password: ''
  };

  // Formulario para editar
  editForm = {
    id: 0,
    username: '',
    email: '',
    password: ''
  };

  constructor() {
    addIcons({
      personAddOutline,
      personOutline,
      mailOutline,
      lockClosedOutline,
      addCircleOutline,
      refreshOutline,
      peopleOutline,
      createOutline,
      trashOutline,
      closeOutline
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ionViewWillEnter(): void {
    this.loadUsers();
  }

  /**
   * Mostrar mensajes Toast nativos de Ionic
   */
  async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Cargar la lista completa de usuarios desde el backend PHP
   */
  loadUsers(): void {
    this.isLoadingList = true;
    this.cdr.detectChanges();

    this.userService.getUsers().subscribe({
      next: (res) => {
        this.isLoadingList = false;
        if (res && res.success && Array.isArray(res.data)) {
          this.users = res.data;
        } else {
          this.users = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingList = false;
        console.error('Error al cargar usuarios:', err);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Modal para Crear Usuario
   */
  openCreateModal(): void {
    this.resetCreateForm();
    this.isCreateModalOpen = true;
    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.cdr.detectChanges();
  }

  /**
   * Enviar formulario de creación de usuario
   */
  onCreateSubmit(event: Event): void {
    event.preventDefault();

    if (!this.createForm.username.trim() || !this.createForm.email.trim() || !this.createForm.password) {
      this.presentToast('Por favor llena todos los campos obligatorios.', 'warning');
      return;
    }

    this.isSubmitting = true;
    this.userService.createUser({
      username: this.createForm.username.trim(),
      email: this.createForm.email.trim(),
      password: this.createForm.password
    }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.presentToast(res.message || '¡Usuario registrado correctamente!', 'success');
          this.closeCreateModal();
          this.resetCreateForm();
          this.loadUsers();
        } else {
          this.presentToast(res.message || 'No se pudo crear el usuario.', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message || 'Error al conectar con la API de usuarios.';
        this.presentToast(`Error: ${msg}`, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Modal para Editar Usuario
   */
  openEditModal(user: UserItem): void {
    this.selectedUser = user;
    this.editForm = {
      id: user.id,
      username: user.username,
      email: user.email,
      password: ''
    };
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedUser = null;
    this.cdr.detectChanges();
  }

  /**
   * Enviar actualización de usuario
   */
  onUpdateSubmit(event: Event): void {
    event.preventDefault();

    if (!this.editForm.username.trim() || !this.editForm.email.trim()) {
      this.presentToast('Nombre de usuario y correo son requeridos.', 'warning');
      return;
    }

    this.isSubmitting = true;
    this.userService.updateUser({
      id: this.editForm.id,
      username: this.editForm.username.trim(),
      email: this.editForm.email.trim(),
      password: this.editForm.password || undefined
    }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.presentToast(res.message || '¡Usuario actualizado correctamente!', 'success');
          this.closeEditModal();
          this.loadUsers();
        } else {
          this.presentToast(res.message || 'No se pudo actualizar el usuario.', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message || 'Error al actualizar el usuario.';
        this.presentToast(`Error: ${msg}`, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Confirmar eliminación de usuario
   */
  async confirmDelete(user: UserItem): Promise<void> {
    const alertEl = await this.alertCtrl.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar al usuario "${user.username}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.executeDelete(user.id);
          }
        }
      ]
    });

    await alertEl.present();
  }

  /**
   * Ejecutar llamada DELETE a la API PHP
   */
  private executeDelete(id: number): void {
    this.userService.deleteUser(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.presentToast(res.message || 'Usuario eliminado correctamente.', 'success');
          this.loadUsers();
        } else {
          this.presentToast(res.message || 'No se pudo eliminar el usuario.', 'danger');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al eliminar el usuario.';
        this.presentToast(`Error: ${msg}`, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  private resetCreateForm(): void {
    this.createForm = {
      username: '',
      email: '',
      password: ''
    };
  }
}
