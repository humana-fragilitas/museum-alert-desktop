import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';
import { catchError, map, Observable, of, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';
import { ApiResponse, ErrorApiResponse, SuccessApiResponse } from '@shared/models';

export interface Sensor {
  thingName: string;
  company: string;
}

export interface ListThingsResponse {
  company: string;
  things: Sensor[];
  totalCount: number;
  nextToken?: string;
  hasMore: boolean;
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
    
    return this.httpClient.get<ApiResponse<Sensor>>(apiUrl, {
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<ApiResponse<Sensor>>) => {

        if (response.status === 200) {

          const body = response.body as SuccessApiResponse<Sensor>;
          console.log(`[DeviceRegistryService]: found device with name ${body.data.thingName}: ${JSON.stringify(response.body)}`);
          console.log(`[DeviceRegistryService]: device associated company ` +
                      `${ company === body.data.company ? 'matches with user\'s organization' : 'does not match with user\'s organization' }`);  
          return body.data as Sensor;
          
        }

        return null;

      }),
      catchError((response: HttpErrorResponse) => {
        
        const errorBody = response.error as ErrorApiResponse;

        if (response.status === 404) {
          console.log(`[DeviceRegistryService]: device with name ${thingName} not found (404)`);
          return of(null);
        } else {
          console.error(`[DeviceRegistryService]: error checking device existence:`, errorBody);
          throw response;
        }

      })
    );
  }

  getAllSensors(): Observable<Sensor[]> {
    const apiUrl = `${APP_CONFIG.aws.apiGateway}/things`;
    
    return this.httpClient.get<ListThingsResponse>(apiUrl).pipe(
      map((response: ListThingsResponse) => {
        console.log(`[DeviceRegistryService]: found ${response.things.length} devices for company ${response.company}`);
        return response.things; // Extract just the things array
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          console.log(`[DeviceRegistryService]: no devices found`);
          return of([]);
        } else {
          console.error(`[DeviceRegistryService]: error while listing devices:`, error);
          throw error;
        }
      })
    );
  }

}