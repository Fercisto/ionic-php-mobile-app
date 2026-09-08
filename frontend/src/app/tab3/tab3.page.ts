import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  NavController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { AuthService, UserProfile } from '../services/auth.service';

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
    IonIcon
  ],
})
export class Tab3Page implements OnInit {
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);

  user: UserProfile | null = null;

  constructor() {
    addIcons({ logOutOutline });
  }

  ngOnInit(): void {
    this.loadUserSession();
  }

  ionViewWillEnter(): void {
    this.loadUserSession();
  }

  private loadUserSession(): void {
    this.user = this.authService.getUser();
    if (!this.user) {
      this.navCtrl.navigateRoot('/login');
    }
  }

  logout(): void {
    this.authService.logout();
    this.navCtrl.navigateRoot('/login');
  }

  goToLogin(): void {
    this.navCtrl.navigateRoot('/login');
  }
}
