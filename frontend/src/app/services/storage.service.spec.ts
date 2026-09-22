import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StorageService, provideZonelessChangeDetection(), provideIonicAngular()],
    });
    service = TestBed.inject(StorageService);
  });

  it('should persist and recover user data', async () => {
    const user = { id: 1, username: 'demo', email: 'demo@test.com' };

    await service.set('auth_user_session', user);
    const recovered = await service.get<typeof user>('auth_user_session');

    expect(recovered).toEqual(user);
  });
});
