import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, NavController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, CommonModule, FormsModule],
})
export class LoginPage implements OnInit {
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);

  isSignUp: boolean = false;
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.navCtrl.navigateRoot('/tabs/tab1');
    }
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

  toggleMode(): void {
    this.isSignUp = !this.isSignUp;
    this.resetForm();
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    if (this.isSignUp) {
      if (!this.username.trim() || !this.email.trim() || !this.password) {
        this.presentToast('Por favor completa todos los campos.', 'warning');
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.presentToast('Las contraseñas no coinciden.', 'warning');
        return;
      }

      this.isLoading = true;
      this.authService.register({
        username: this.username.trim(),
        email: this.email.trim(),
        password: this.password
      }).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.presentToast(res.message || '¡Cuenta creada exitosamente!', 'success');
          this.isSignUp = false;
          this.resetForm();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'Error al conectar con el servidor PHP.';
          this.presentToast(`Error: ${msg}`, 'danger');
        }
      });
    } else {
      if (!this.username.trim() || !this.password) {
        this.presentToast('Ingresa tu usuario y contraseña.', 'warning');
        return;
      }

      this.isLoading = true;
      this.authService.login({
        username: this.username.trim(),
        password: this.password
      }).subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.user) {
            this.authService.saveSession(res.user);
          }
          this.presentToast(res.message || '¡Bienvenido!', 'success');
          this.navCtrl.navigateRoot('/tabs/tab1');
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'Error de autenticación. Verifica tus datos o el servidor PHP.';
          this.presentToast(`Error: ${msg}`, 'danger');
        }
      });
    }
  }

  resetForm(): void {
    this.username = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
  }
}
