import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';
import { map, Observable, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';

@Injectable({
  providedIn: 'root'
})
export class ProvisioningService {

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService,
    private deviceService: DeviceService
  ) { }

  createClaim(): Observable<any> {

    const cid = this.deviceService.generateCid();

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`;
    return this.httpClient.post(apiUrl, null).pipe(
      map((response: any) => ({
        ...response,
        cid,
        idToken: this.authService
                     .session
                    ?.tokens
                    ?.idToken
                    ?.toString()
      }))
    );

  }

}
