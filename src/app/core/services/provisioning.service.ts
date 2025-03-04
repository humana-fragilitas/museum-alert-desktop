import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { APP_CONFIG } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProvisioningService {

  constructor(private httpClient: HttpClient) {

    
  }

  register(deviceName: string) {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/device-management/managed-devices/`;
  
    this.httpClient.post(apiUrl, {
      deviceName 
    }).subscribe((certificates:any) => {

      console.log(certificates);

    });

  }

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
  createClaim() {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`;
    this.httpClient.post(apiUrl, null).subscribe((claim:any)=> {

      const testBluetoothPayload = {
        tempCertPem: claim.certificatePem,
        tempPrivateKey: claim.keyPair.PrivateKey
      };
      console.log("<|" + JSON.stringify(testBluetoothPayload) + "|>");
      console.log(claim);
    });

  }

}
