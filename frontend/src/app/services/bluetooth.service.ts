/// <reference types="cordova-plugin-bluetoothle" />
import { Injectable, NgZone, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BleClient, ScanMode, ScanResult } from '@capacitor-community/bluetooth-le';

/**
 * Invitación a un proyecto que viaja de un teléfono a otro por Bluetooth.
 */
export interface ProjectInvitation {
  type: 'project_invite';
  project_id: number;
  project_title: string;
  from_user_id: number;
  from_username: string;
}

/**
 * Teléfono cercano con TeamFlow abierto en modo "recibir invitaciones".
 */
export interface NearbyDevice {
  deviceId: string;
  userId: number;
  rssi?: number;
}

// UUIDs propios de TeamFlow: identifican el servicio y la característica donde se escribe la invitación.
const SERVICE_UUID = '7d2ea2b0-6b1f-4c8a-9a3e-2f5c1d0e8a01';
const INVITE_CHARACTERISTIC_UUID = '7d2ea2b1-6b1f-4c8a-9a3e-2f5c1d0e8a01';

// BLE envía los datos en trozos pequeños; el salto de línea marca el final del mensaje.
const END_OF_MESSAGE = 0x0a;
const DEFAULT_MTU = 23;

/**
 * Comunicación Bluetooth Low Energy entre dos teléfonos con TeamFlow.
 *
 * - Receptor (periférico): se anuncia con el ID de su usuario y espera que le escriban.
 *   Usa cordova-plugin-bluetoothle, porque es el que soporta el rol periférico.
 * - Emisor (central): busca receptores cercanos, se conecta y escribe la invitación.
 *   Usa @capacitor-community/bluetooth-le.
 */
@Injectable({
  providedIn: 'root'
})
export class BluetoothService {
  private zone = inject(NgZone);

  private centralReady = false;
  private peripheralReady?: Promise<void>;
  private isAdvertising = false;
  private onInvitation?: (invitation: ProjectInvitation) => void;
  private receiveBuffers = new Map<string, number[]>();
  private scanTimer?: ReturnType<typeof setTimeout>;
  private scanDone?: () => void;

  get isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  // -------------------------------------------------------------
  // RECEPTOR (PERIFÉRICO)
  // -------------------------------------------------------------

  /**
   * Hace visible este teléfono para que otros miembros le envíen invitaciones.
   */
  async startReceiving(userId: number, onInvitation: (invitation: ProjectInvitation) => void): Promise<void> {
    this.ensureNative();
    await this.prepareCentral();
    await this.requestAdvertisePermission();
    await this.initPeripheral();

    this.onInvitation = onInvitation;
    this.receiveBuffers.clear();

    await this.cordovaCall((ok, fail) => bluetoothle.removeAllServices(ok, fail));
    await this.cordovaCall<{ service: string; status: BluetoothlePlugin.Status }>((ok, fail) => bluetoothle.addService(ok, fail, {
      service: SERVICE_UUID,
      characteristics: [{
        uuid: INVITE_CHARACTERISTIC_UUID,
        permissions: { write: true },
        properties: { write: true, writeWithoutResponse: true }
      }]
    }));

    // startAdvertising de Android renombra el adaptador con "name", así que se le pasa el nombre actual.
    const adapterName = await new Promise<string>(resolve => {
      (bluetoothle as unknown as { getAdapterInfo: (cb: (info: { name?: string }) => void) => void })
        .getAdapterInfo(info => resolve(info?.name ?? ''));
    });

    // El ID del usuario viaja en el anuncio (4 bytes) para que el emisor sepa quién es.
    const userIdBytes = new Uint8Array(4);
    new DataView(userIdBytes.buffer).setUint32(0, userId);

    await this.cordovaCall<{ status: BluetoothlePlugin.Status }>((ok, fail) => bluetoothle.startAdvertising(ok, fail, {
      service: SERVICE_UUID,
      serviceData: bluetoothle.bytesToEncodedString(userIdBytes),
      name: adapterName,
      mode: 'lowLatency',
      connectable: true,
      timeout: 0,
      includeDeviceName: false,
      includeTxPowerLevel: false
    } as BluetoothlePlugin.AdvertisingParams));
    this.isAdvertising = true;
  }

  async stopReceiving(): Promise<void> {
    this.onInvitation = undefined;
    this.receiveBuffers.clear();
    if (!this.isAdvertising) return;
    this.isAdvertising = false;
    await this.cordovaCall((ok, fail) => bluetoothle.stopAdvertising(ok, fail)).catch(() => undefined);
    await this.cordovaCall((ok, fail) => bluetoothle.removeAllServices(ok, fail)).catch(() => undefined);
  }

  private initPeripheral(): Promise<void> {
    // initializePeripheral solo debe llamarse una vez; su callback recibe todos los eventos después.
    if (!this.peripheralReady) {
      this.peripheralReady = new Promise<void>((resolve, reject) => {
        let started = false;
        bluetoothle.initialize(() => {
          // Este callback se repite cada vez que cambia el estado del Bluetooth.
          if (started) return;
          started = true;
          bluetoothle.initializePeripheral(
            event => this.zone.run(() => {
              if (event.status === 'enabled') resolve();
              if (event.status === 'disabled') reject(new Error('Activa el Bluetooth para continuar.'));
              this.handlePeripheralEvent(event as unknown as PeripheralEvent);
            }),
            error => reject(this.toError(error)),
            { request: true }
          );
        }, { request: true, statusReceiver: false });
      }).catch(error => {
        this.peripheralReady = undefined;
        throw error;
      });
    }
    return this.peripheralReady;
  }

  private handlePeripheralEvent(event: PeripheralEvent): void {
    if (event.status === 'disconnected' && event.address) {
      this.receiveBuffers.delete(event.address);
      return;
    }
    if (event.status !== 'writeRequested' || !event.address || !event.value) return;
    if (event.characteristic?.toLowerCase() !== INVITE_CHARACTERISTIC_UUID) return;

    if (event.responseNeeded !== false) {
      bluetoothle.respond(() => undefined, () => undefined, {
        requestId: event.requestId ?? 0,
        value: event.value,
        offset: event.offset ?? 0,
        address: event.address
      });
    }

    const buffer = this.receiveBuffers.get(event.address) ?? [];
    buffer.push(...bluetoothle.encodedStringToBytes(event.value));

    if (buffer[buffer.length - 1] !== END_OF_MESSAGE) {
      this.receiveBuffers.set(event.address, buffer);
      return;
    }

    this.receiveBuffers.delete(event.address);
    const invitation = this.parseInvitation(new Uint8Array(buffer.slice(0, -1)));
    if (invitation) {
      this.onInvitation?.(invitation);
    }
  }

  private parseInvitation(bytes: Uint8Array): ProjectInvitation | null {
    try {
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (data?.type === 'project_invite' && Number(data.project_id) > 0) {
        return data as ProjectInvitation;
      }
    } catch {
      // Mensaje incompleto o de otra app: se ignora.
    }
    return null;
  }

  // -------------------------------------------------------------
  // EMISOR (CENTRAL)
  // -------------------------------------------------------------

  /**
   * Busca teléfonos cercanos en modo "recibir invitaciones" durante unos segundos.
   */
  async scanNearby(onFound: (device: NearbyDevice) => void, durationMs = 10000): Promise<void> {
    this.ensureNative();
    await this.prepareCentral();
    await this.stopScan();

    await BleClient.requestLEScan(
      { serviceData: [{ serviceUuid: SERVICE_UUID }], scanMode: ScanMode.SCAN_MODE_LOW_LATENCY },
      result => this.zone.run(() => {
        const userId = this.readUserId(result);
        if (userId) {
          onFound({ deviceId: result.device.deviceId, userId, rssi: result.rssi });
        }
      })
    );

    await new Promise<void>(resolve => {
      this.scanDone = resolve;
      this.scanTimer = setTimeout(resolve, durationMs);
    });
    await this.stopScan();
  }

  async stopScan(): Promise<void> {
    clearTimeout(this.scanTimer);
    this.scanDone?.();
    this.scanDone = undefined;
    if (this.centralReady) {
      await BleClient.stopLEScan().catch(() => undefined);
    }
  }

  /**
   * Se conecta al teléfono receptor y le escribe la invitación en trozos.
   */
  async sendInvitation(deviceId: string, invitation: ProjectInvitation): Promise<void> {
    this.ensureNative();
    await this.prepareCentral();
    await this.stopScan();

    await BleClient.connect(deviceId, undefined, { timeout: 10000 });
    try {
      const mtu = await BleClient.getMtu(deviceId).catch(() => DEFAULT_MTU);
      const chunkSize = Math.max(20, mtu - 3);
      const message = new TextEncoder().encode(JSON.stringify(invitation));
      const bytes = new Uint8Array(message.length + 1);
      bytes.set(message);
      bytes[message.length] = END_OF_MESSAGE;

      for (let start = 0; start < bytes.length; start += chunkSize) {
        const chunk = bytes.slice(start, start + chunkSize);
        await BleClient.write(deviceId, SERVICE_UUID, INVITE_CHARACTERISTIC_UUID, new DataView(chunk.buffer));
      }
    } finally {
      await BleClient.disconnect(deviceId).catch(() => undefined);
    }
  }

  private readUserId(result: ScanResult): number | null {
    const entry = Object.entries(result.serviceData ?? {})
      .find(([uuid]) => uuid.toLowerCase() === SERVICE_UUID);
    const data = entry?.[1];
    return data && data.byteLength >= 4 ? data.getUint32(0) : null;
  }

  // -------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------

  private ensureNative(): void {
    if (!this.isSupported) {
      throw new Error('El Bluetooth solo funciona en la app instalada en el teléfono.');
    }
  }

  /**
   * Pide los permisos de Bluetooth (escanear y conectar) y que el usuario encienda el Bluetooth.
   */
  private async prepareCentral(): Promise<void> {
    if (!this.centralReady) {
      await BleClient.initialize();
      this.centralReady = true;
    }
    if (!(await BleClient.isEnabled())) {
      await BleClient.requestEnable();
    }
  }

  /**
   * Android 12+ exige el permiso BLUETOOTH_ADVERTISE para anunciarse. En versiones anteriores no existe.
   */
  private async requestAdvertisePermission(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    const { hasPermission } = await this.cordovaCall<{ hasPermission: boolean }>(
      ok => bluetoothle.hasPermissionBtAdvertise(ok)
    ).catch(() => ({ hasPermission: true }));
    if (hasPermission) return;

    const { requestPermission } = await this.cordovaCall<{ requestPermission: boolean }>(
      // Los tipos del plugin omiten el callback de error, pero la función lo acepta (ver su README).
      (ok, fail) => (bluetoothle.requestPermissionBtAdvertise as unknown as (
        success: (result: { requestPermission: boolean }) => void,
        error: (error: BluetoothlePlugin.Error) => void
      ) => void)(ok, fail)
    );
    if (!requestPermission) {
      throw new Error('Se necesita el permiso de Bluetooth para que otros te encuentren.');
    }
  }

  private cordovaCall<T = unknown>(
    fn: (ok: (result: T) => void, fail: (error: BluetoothlePlugin.Error) => void) => void
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => fn(resolve, error => reject(this.toError(error))));
  }

  private toError(error: unknown): Error {
    if (error instanceof Error) return error;
    const message = (error as { message?: string })?.message;
    return new Error(message || 'Error de Bluetooth.');
  }
}

interface PeripheralEvent {
  status: string;
  address?: string;
  characteristic?: string;
  requestId?: number;
  value?: string;
  offset?: number;
  responseNeeded?: boolean;
}
