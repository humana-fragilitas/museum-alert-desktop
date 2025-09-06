import { Injectable,
         effect,
         NgZone,
         Inject } from '@angular/core';

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

  async onSystemEvent(event: MainProcessEvent) {

    switch(event) {
      case MainProcessEvent.SYSTEM_RESUMED:
        console.log('[AuthConnectionManagerService]: system resumed');
        this.resumed = true;
        break;
      case MainProcessEvent.SYSTEM_SUSPENDED:
        console.log('[AuthConnectionManagerService]: system suspended');
        this.resumed = false;
        await this.mqttService.cleanup(true);
        break;
      case MainProcessEvent.SYSTEM_ONLINE:
        console.log('[AuthConnectionManagerService]: system online');
        this.online = true;
        break;
      case MainProcessEvent.SYSTEM_OFFLINE:
        console.log('[AuthConnectionManagerService]: system offline');
        this.online = false;
        await this.mqttService.cleanup(true);
        break;
    }

  }

  async onStatusCheck() {

    if (this.shouldRefreshSession()) {
      console.log('[AuthConnectionManagerService]: refreshing session...');
      await this.authService.fetchSession({ forceRefresh: true });
    }

    if (this.shouldRefreshMqttConnection()) {
      console.log('[AuthConnectionManagerService]: refreshing MQTT connection...');
      await this.mqttService.handleSessionChange(this.authService.sessionData());
    }

  }

  private initializeSystemHandlers() {

    const systemEvents = [
      MainProcessEvent.SYSTEM_RESUMED,
      MainProcessEvent.SYSTEM_SUSPENDED,
      MainProcessEvent.SYSTEM_ONLINE,
      MainProcessEvent.SYSTEM_OFFLINE
    ];

    for (const event of systemEvents) {
      this.win?.electron?.ipcRenderer.on(event, () => {
        this.ngZone.run(() => {
          this.onSystemEvent(event);
        });
      });
    }

    this.win?.electron?.ipcRenderer.on(MainProcessEvent.STATUS_CHECK, () => {
      this.ngZone.run(() => {
        this.onStatusCheck();
      });
    });

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

  private initializeAuthHandlers() {

    effect(async () => {
      const session = this.authService.sessionData();
      const hasPolicy = this.authService.hasPolicy();
      if (session) {
        if (!hasPolicy) {
           console.log(`[AuthConnectionManagerService]: authenticated user has no IoT policy; attaching policy...`);
           try {
             await this.policyService.attachPolicy();
             await this.authService.fetchSession({ forceRefresh: true });
           } catch (error) {
             console.error(`[AuthConnectionManagerService]: failed to attach IoT policy:`, error);
           }
        }
      } else {
        await this.mqttService.cleanup(false);
      }
    });

  }

  private shouldRefreshSession(): boolean {

    return !!this.authService.sessionData() &&
             this.online &&
             this.resumed &&
             this.authService.isSessionTokenExpired();
             
  }

  private shouldRefreshMqttConnection(): boolean {

    return (
           !!this.authService.sessionData() &&
           this.authService.hasPolicy() &&
           !this.authService.isSessionTokenExpired()
           ) &&
           (
           this.online &&
           this.resumed
           ) &&
           (
           !this.mqttService.isConnected &&
           !this.mqttService.isConnecting
           );

  }

}


