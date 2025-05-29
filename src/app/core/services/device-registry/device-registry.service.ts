import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';
import { catchError, map, Observable, of, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';

export interface Sensor {
  thingName: string;
  company: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceRegistryService {

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService,
    private deviceService: DeviceService) { }

checkSensorExists(thingName: string): Observable<Nullable<Sensor>> {

    const company = this.authService.sessionData
      ?.getValue()
      ?.tokens
      ?.idToken
      ?.payload
      ?.['custom:Company'];

    console.log(`[DeviceRegistryService]: checking device with name ${thingName} ` +
      `(company: ${company}) for existence in the registry...`);

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/things/${thingName}/`;
    
    return this.httpClient.get<Sensor>(apiUrl, {
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<Sensor>) => {
        if (response.status === 200) {
          console.log(`[DeviceRegistryService]: found device with name ${response.body?.thingName}: ${JSON.stringify(response.body)}`);
          console.log(`[DeviceRegistryService]: device associated company ` +
                      `${ company === response.body?.company ? 'matches with user\'s organization' : 'does not match with user\'s organization' }`);  
          return response.body;
        }
        return null;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          console.log(`[DeviceRegistryService]: device with name ${thingName} not found (404)`);
          return of(null); // Device doesn't exist
        } else {
          console.error(`[DeviceRegistryService]: error checking device existence:`, error);
          throw error; // Re-throw other errors
        }
      })
    );
  }

}