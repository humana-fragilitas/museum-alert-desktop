import { fetchAuthSession,
         FetchAuthSessionOptions,
         AuthSession,
         getCurrentUser,
         fetchUserAttributes,
         GetCurrentUserOutput,
         FetchUserAttributesOutput } from 'aws-amplify/auth';
import { Hub, HubCapsule } from '@aws-amplify/core';
import { AuthHubEventData } from '@aws-amplify/core/dist/esm/Hub/types';

import { Injectable, signal, computed, effect, NgZone, Inject } from '@angular/core';
import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';
import { msToHMS } from '@shared/helpers/milliseconds-to-readable-time.helper';
import { AuthService } from '@services/auth/auth.service';
import { MqttService } from '@services/mqtt/mqtt.service';

@Injectable({
  providedIn: 'root'
})
export class AuthConnectionManagerService {

  constructor(@Inject(WINDOW) private win: Window,
                              private ngZone: NgZone,
                              private authService: AuthService,
                              private mqttService: MqttService) {

    this.initializeSystemHandlers();
    this.initializeAuthHandlers();
    this.initializeMqttHandlers();

    console.log('[AuthConnectionManagerService]: instance created');

  }

  // new methods
  initializeSystemHandlers() {

    this.win.addEventListener('online', () => {
      console.log('[AuthConnectionManagerService]: system is online; refreshing session...');
      this.authService.fetchSession({ forceRefresh: true });
    });

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
          if (this.authService.isSessionTokenExpired()) {
            console.log('[AuthConnectionManagerService]: user session is expired; refreshing session...');
            this.authService.fetchSession({ forceRefresh: true });
          }
        });
      });

      this.win.electron.ipcRenderer.on(MainProcessEvent.SYSTEM_RESUMED, () => {
        this.ngZone.run(() => {
          console.log('[AuthConnectionManagerService]: system resumed; refreshing session...');
          this.authService.fetchSession({ forceRefresh: true });
        });
      });

    }

    this.win.addEventListener('offline', () => {
      this.ngZone.run(() => {
        console.log('[AuthConnectionManagerService]: system is offline; disconnecting from MQTT broker...');
        this.mqttService.cleanup();
      });
    });

    this.win.addEventListener('online', () => {
      this.ngZone.run(() => {
        console.log('[AuthConnectionManagerService]: system is online; refreshing session...');
        this.authService.fetchSession({ forceRefresh: true });
      });
    });

    if (this.win.electron) {
      this.win.electron.ipcRenderer.on(MainProcessEvent.SYSTEM_SUSPENDED, () => {
        this.ngZone.run(() => {
          console.log('[AuthConnectionManagerService]: system suspended; initiating disconnect...');
          this.mqttService.cleanup();
        });
      });
    }

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

  initializeMqttHandlers() {

    this.mqttService.isConnected$.subscribe(isConnected => {
      if (!isConnected) {
        // Check if user has policy
        if (!this.authService.hasPolicy()) {
        console.log('[AuthConnectionManagerService]: user does not have an iot policy attached yet; skipping...');
        return;
        }
        console.log('[AuthConnectionManagerService]: MQTT is scheduled to reconnect');
        if (this.authService.isSessionTokenExpired()) {
          console.log('[AuthConnectionManagerService]: auth session is expired; refreshing session before reconnecting to MQTT broker...');
          this.authService.fetchSession({ forceRefresh: true });
        } else if (this.authService.sessionData()) {
          console.log('[AuthConnectionManagerService]: auth session is valid; reconnecting to MQTT broker...');
          this.mqttService.handleSessionChange(this.authService.sessionData() as AuthSession);
          } else {
          console.log('[AuthConnectionManagerService]: cannot reconnect to MQTT broker - no valid user session');
          this.mqttService.cleanup();
        }
      }
    });


    effect(() => {
      const isConnected = this.mqttService.isConnected;
      if (!isConnected) {

      }
    });

  }

}


