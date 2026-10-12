import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  AlertController,
  ToastController,
  NavController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, bluetoothOutline } from 'ionicons/icons';
import { AuthService, UserProfile } from '../services/auth.service';
import { BluetoothService, ProjectInvitation } from '../services/bluetooth.service';
import { ProjectService } from '../services/project.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner
  ],
})
export class Tab3Page implements OnInit {
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private bluetooth = inject(BluetoothService);
  private projectService = inject(ProjectService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  user: UserProfile | null = null;

  // Recibir invitaciones por Bluetooth
  isReceiving: boolean = false;
  isStartingBluetooth: boolean = false;

  constructor() {
    addIcons({ logOutOutline, bluetoothOutline });
  }

  ngOnInit(): void {
    this.loadUserSession();
  }

  ionViewWillEnter(): void {
    this.loadUserSession();
  }

  ionViewWillLeave(): void {
    this.stopReceiving();
  }

  private loadUserSession(): void {
    this.user = this.authService.getUser();
    if (!this.user) {
      this.navCtrl.navigateRoot('/login');
    }
  }

  logout(): void {
    this.stopReceiving();
    this.authService.logout();
    this.navCtrl.navigateRoot('/login');
  }

  goToLogin(): void {
    this.navCtrl.navigateRoot('/login');
  }

  // =========================================================================
  // INVITACIONES POR BLUETOOTH
  // =========================================================================

  async toggleReceiving(): Promise<void> {
    if (this.isReceiving) {
      await this.stopReceiving();
      return;
    }
    if (!this.user || this.isStartingBluetooth) return;

    this.isStartingBluetooth = true;
    this.cdr.detectChanges();
    try {
      await this.bluetooth.startReceiving(this.user.id, invitation => this.showInvitation(invitation));
      this.isReceiving = true;
    } catch (error) {
      this.presentToast((error as Error).message || 'No se pudo activar el Bluetooth.', 'danger');
    } finally {
      this.isStartingBluetooth = false;
      this.cdr.detectChanges();
    }
  }

  private async stopReceiving(): Promise<void> {
    if (!this.isReceiving) return;
    this.isReceiving = false;
    this.cdr.detectChanges();
    await this.bluetooth.stopReceiving();
  }

  private async showInvitation(invitation: ProjectInvitation): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Invitación a proyecto',
      message: `${invitation.from_username} te invita a unirte a "${invitation.project_title}".`,
      buttons: [
        { text: 'Rechazar', role: 'cancel' },
        { text: 'Unirme', handler: () => this.acceptInvitation(invitation) }
      ]
    });
    await alert.present();
  }

  private acceptInvitation(invitation: ProjectInvitation): void {
    if (!this.user) return;
    this.projectService.addMember(invitation.project_id, this.user.id, 'member').subscribe({
      next: (res) => {
        if (res.success) {
          this.presentToast(`¡Te uniste a "${invitation.project_title}"!`, 'success');
        } else {
          this.presentToast(res.message || 'No se pudo aceptar la invitación.', 'danger');
        }
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al aceptar la invitación.';
        this.presentToast(msg, err.status === 409 ? 'warning' : 'danger');
      }
    });
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom', color });
    await toast.present();
  }
}
