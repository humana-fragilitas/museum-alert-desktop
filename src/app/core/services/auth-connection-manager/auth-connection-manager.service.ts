import { AuthSession } from 'aws-amplify/auth';
import { AuthenticatorService } from '@aws-amplify/ui-angular';

import { Injectable, effect, NgZone, Inject } from '@angular/core';

import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';
import { AuthService } from '@services/auth/auth.service';
import { MqttService } from '@services/mqtt/mqtt.service';
import { distinctUntilChanged, Subscription } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthConnectionManagerService {

  private readonly MAX_RETRY_ATTEMPTS = 5;
  private retryAttempts = 0;
  private online = true;
  private resumed = true;
  private onlineHandler?: () => void;
  private offlineHandler?: () => void;

  constructor(@Inject(WINDOW) private win: Window,
                              private ngZone: NgZone,
                              private authenticatorService: AuthenticatorService,
                              private authService: AuthService,
                              private mqttService: MqttService) {

    this.initializeSystemHandlers();
    this.initializeAuthHandlers();
    this.initializeMqttHandlers();

    console.log('[AuthConnectionManagerService]: instance created');

  }

  // new methods
  initializeSystemHandlers() {

    if (this.win.electron) {

      this.win.electron.ipcRenderer.on(MainProcessEvent.WINDOW_FOCUSED, () => {
        this.ngZone.run(() => {
          if (this.authService.isSessionTokenExpired()) {
            console.log('[AuthConnectionManagerService]: user session is expired; refreshing session...');
            this.authService.fetchSession({ forceRefresh: true });
          }
        });
      });

      this.win.electron.ipcRenderer.on(MainProcessEvent.SESSION_CHECK, () => {
        this.ngZone.run(() => {
          if (this.shouldRefreshSession()) {
            console.log('[AuthConnectionManagerService]: user session is expired; refreshing session...');
            this.authService.fetchSession({ forceRefresh: true });
          }
        });
      });

      this.win.electron.ipcRenderer.on(MainProcessEvent.SYSTEM_RESUMED, () => {
        this.ngZone.run(() => {
          console.log('[AuthConnectionManagerService]: system resumed; refreshing session...');
          this.resumed = true;
          this.mqttService.cleanup();
        });
      });

      this.win.electron.ipcRenderer.on(MainProcessEvent.SYSTEM_SUSPENDED, () => {
        this.ngZone.run(() => {
          console.log('[AuthConnectionManagerService]: system suspended; initiating disconnect...');
          this.resumed = false;
          this.mqttService.cleanup();
        });
      });

    }

    this.offlineHandler = () => {
      this.ngZone.run(() => {
        console.log('[AuthConnectionManagerService]: system is offline; disconnecting from MQTT broker...');
        this.online = false
        this.mqttService.cleanup();
      });
    };

    this.onlineHandler = () => {
      this.ngZone.run(() => {
        console.log('[AuthConnectionManagerService]: system is online; refreshing session...');
        this.online = true;
      });
    };

    this.win.addEventListener('offline', this.offlineHandler);
    this.win.addEventListener('online', this.onlineHandler);

  }

  /**
   * Note: MQTT connection state changes are always triggered by session 
   * retrieval attempts - either successful (connects) or unsuccessful 
   * (disconnects). System events (online/offline, suspend/resume) also 
   * trigger session retrieval, ensuring the MQTT connection reflects 
   * both user session validity and system connectivity
   */

  initializeAuthHandlers() {

    effect(() => {
      const session = this.authService.sessionData();
      if (session) {
        this.mqttService.handleSessionChange(session);
      }
    });

  }

  shouldRefreshSession(): boolean {
    return (this.authService.isSessionTokenExpired() ||
           !this.mqttService.isConnected) && this.online && this.resumed;
  }

  initializeMqttHandlers() {

    // const subscription = this.mqttService.isConnected$
    //     .pipe(
    //       distinctUntilChanged()
    //     ).subscribe(isConnected => {
    //       if (!isConnected) {
    //         if (++this.retryAttempts <= this.MAX_RETRY_ATTEMPTS) {
    //           console.log(`[AuthConnectionManagerService]: MQTT connection lost, attempting to reconnect... (attempt ${this.retryAttempts})`);
    //           this.authService.fetchSession({ forceRefresh: true });
    //         } else {
    //           console.error('[AuthConnectionManagerService]: maximum MQTT reconnection attempts reached; logging out user');
    //           this.authenticatorService.signOut();
    //         }
    //       } else {
    //         this.retryAttempts = 0;
    //       }
    //     });

  }

}


