import { Injectable, effect, NgZone, Inject } from '@angular/core';

import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';
import { AuthService } from '@services/auth/auth.service';
import { MqttService } from '@services/mqtt/mqtt.service';
import { PolicyService } from '@services/policy/policy.service';


@Injectable({
  providedIn: 'root'
})
export class AuthConnectionManagerService {

  private online = true;
  private resumed = true;
  private onlineHandler?: () => void;
  private offlineHandler?: () => void;

  constructor(@Inject(WINDOW) private win: Window,
                              private ngZone: NgZone,
                              private authService: AuthService,
                              private policyService: PolicyService,
                              private mqttService: MqttService) {

    this.initializeSystemHandlers();
    this.initializeAuthHandlers();

    console.log('[AuthConnectionManagerService]: instance created');

  }

  private initializeSystemHandlers() {

    if (this.win.electron) {

      this.win.electron.ipcRenderer.on(MainProcessEvent.WINDOW_FOCUSED, () => {
        this.ngZone.run(() => {
          this.onSystemEvent(MainProcessEvent.WINDOW_FOCUSED);
        });
      });

      this.win.electron.ipcRenderer.on(MainProcessEvent.SESSION_CHECK, () => {
        this.ngZone.run(() => {
          this.onSystemEvent(MainProcessEvent.SESSION_CHECK);
        });
      });

      this.win.electron.ipcRenderer.on(MainProcessEvent.SYSTEM_RESUMED, () => {
        this.ngZone.run(() => {
          console.log('[AuthConnectionManagerService]: system resumed; refreshing session...');
          this.onSystemEvent(MainProcessEvent.SYSTEM_RESUMED);
        });
      });

      this.win.electron.ipcRenderer.on(MainProcessEvent.SYSTEM_SUSPENDED, () => {
        this.onSystemEvent(MainProcessEvent.SYSTEM_SUSPENDED);
        this.ngZone.run(() => {
          console.log('[AuthConnectionManagerService]: system suspended; initiating disconnect...');
          this.onSystemEvent(MainProcessEvent.SYSTEM_SUSPENDED);
        });
      });

    }

    this.offlineHandler = () => {
      this.ngZone.run(() => {
        console.log('[AuthConnectionManagerService]: system is offline; disconnecting from MQTT broker...');
         this.onSystemEvent(MainProcessEvent.SYSTEM_OFFLINE);
      });
    };

    this.onlineHandler = () => {
      this.ngZone.run(() => {
        console.log('[AuthConnectionManagerService]: system is online; refreshing session...');
         this.onSystemEvent(MainProcessEvent.SYSTEM_ONLINE);
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

  private initializeAuthHandlers() {

    effect(async () => {
      const session = this.authService.sessionData();
      const hasPolicy = this.authService.hasPolicy();
      if (session) {
        if (hasPolicy) {
           console.log(`[AuthConnectionManagerService]: authenticated user has IoT policy; handling MQTT session...`);
           this.mqttService.cleanup();
           this.mqttService.handleSessionChange(session);
        } else {
          console.log(`[AuthConnectionManagerService]: authenticated user has no IoT policy; attaching policy...`);
          await this.policyService.attachPolicy(session);
          this.authService.fetchSession({ forceRefresh: true });
        }
      }
    });

  }

  public onSystemEvent(event: MainProcessEvent) {

    switch(event) {
      case MainProcessEvent.WINDOW_FOCUSED:
        console.log('[AuthConnectionManagerService]: window focused');
        break;
      case MainProcessEvent.SYSTEM_RESUMED:
        console.log('[AuthConnectionManagerService]: system resumed');
        this.resumed = true;
        break;
      case MainProcessEvent.SYSTEM_SUSPENDED:
        console.log('[AuthConnectionManagerService]: system suspended');
        this.resumed = false;
        this.mqttService.cleanup();
        break;
      case MainProcessEvent.SYSTEM_ONLINE:
        console.log('[AuthConnectionManagerService]: system online');
        this.online = true;
        break;
      case MainProcessEvent.SYSTEM_OFFLINE:
        console.log('[AuthConnectionManagerService]: system offline');
        this.online = false;
        this.mqttService.cleanup();
        break;
    }

    if (this.shouldRefreshSession()) {
      console.log('[AuthConnectionManagerService]: refreshing session...');
      this.authService.fetchSession({ forceRefresh: true });
    }

  }

  private shouldRefreshSession(): boolean {
    return  !!this.authService.sessionData() &&
              this.online &&
              this.resumed &&
             (this.authService.isSessionTokenExpired() ||
             !this.mqttService.isConnected);
  }

}


