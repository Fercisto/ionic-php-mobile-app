import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, NavController } from '@ionic/angular';
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

  toggleMode(): void {
    this.isSignUp = !this.isSignUp;
    this.resetForm();
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    if (this.isSignUp) {
      if (!this.username.trim() || !this.email.trim() || !this.password) {
        alert('Por favor completa todos los campos.');
        return;
      }

      if (this.password !== this.confirmPassword) {
        alert('Las contraseñas no coinciden.');
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
          alert(res.message || '¡Cuenta creada exitosamente!');
          this.isSignUp = false;
          this.resetForm();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'Error al conectar con el servidor PHP.';
          alert(`Error: ${msg}`);
        }
      });
    } else {
      if (!this.username.trim() || !this.password) {
        alert('Ingresa tu usuario y contraseña.');
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
          this.navCtrl.navigateRoot('/tabs/tab1');
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'Error de autenticación. Verifica tus datos o el servidor PHP.';
          alert(`Error: ${msg}`);
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
