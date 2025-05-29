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
    private deviceService: DeviceService) { }

  /**
   *  Root CA Certificate (CACert):
      The certificatePem value should be used here.
      Set it using net.setCACert(certificatePem).
      Client Certificate and Private Key:
      For the client certificate, use the same certificatePem value.
      For the client private key, use the keyPair.PrivateKey value.
      Set them using net.setCertificate(clientCertificate) and net.setPrivateKey(clientPrivateKey).
   */

  // <| { "ssid": "Test", "password": "qyqijczyz2p37xz" } |>
  createClaim(): Observable<any> {

    const cid = this.deviceService.generateCid();

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`;
    return this.httpClient.post(apiUrl, null).pipe(
      map((response: any) => ({
        ...response,
        cid,
        idToken: this.authService
        .sessionData
        .value
        ?.tokens
        ?.idToken
        ?.toString()
      }))
    );

  }

  checkThingExists(thingName: string): Observable<any> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/things/${thingName}/`;
    return this.httpClient.get(apiUrl, { 
      observe: 'response' 
    });

  }

}
