import { catchError,
         map,
         Observable,
         of } from 'rxjs';

import { HttpClient,
         HttpErrorResponse,
         HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { APP_CONFIG } from '@env/environment';
import { AuthService } from '@services/auth/auth.service';
import { Sensor,
         HttpStatusCode,
         ApiResult,
         ErrorApiResponse,
         SuccessApiResponse } from '@models';


@Injectable({
  providedIn: 'root'
})
export class DeviceRegistryService {

  constructor(private httpClient: HttpClient,
              private authService: AuthService) { }

  checkSensorExists(thingName: string): Observable<Nullable<Sensor>> {

    const company = this.authService.company();

    console.log(`[DeviceRegistryService]: checking device with name ${thingName} ` +
                `(company: ${company}) for existence in the registry...`);

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/things/${thingName}/`;
    
    return this.httpClient.get<ApiResult<Sensor>>(apiUrl, {
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<ApiResult<Sensor>>) => {
        const result = response.body as SuccessApiResponse<Sensor>;
        console.log(`[DeviceRegistryService]: found device with name ` +
                    `${result.data?.thingName}: ${JSON.stringify(response.body)}`);
        console.log(`[DeviceRegistryService]: device associated company ` +
                    `${ (company === result.data?.company) ?
                      'matches with user\'s organization' :
                      'does not match with user\'s organization' }`);  
        return result.data;
      }),
      catchError((exception: HttpErrorResponse) => {
        if (exception.status === HttpStatusCode.NOT_FOUND) {
          console.log(`[DeviceRegistryService]: device with name ${thingName} not found (404)`);
          return of(null);
        } else {
          console.error(`[DeviceRegistryService]: error checking device existence:`,
            exception.error as ErrorApiResponse);
          throw exception;
        }
      })
    );

  }

  deleteSensor(thingName: string): Observable<boolean> {

    const company = this.authService.company();
 
    console.log(`[DeviceRegistryService]: deleting device with name ${thingName} ` +
                `(company: ${company}) from the registry...`);

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/things/${thingName}/`;

    return this.httpClient.delete<ApiResult<Sensor>>(apiUrl, {
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<ApiResult<Sensor>>) => {
        console.log(`[DeviceRegistryService]: deleted device with name ` +
                    `${(response.body as SuccessApiResponse<Sensor>).data.thingName}`);
        return true;
      }),
      catchError((exception: HttpErrorResponse) => {
        if (exception.status === HttpStatusCode.NOT_FOUND) {
          console.log(`[DeviceRegistryService]: device with name ${thingName} not found (404)`);
        } else {
        console.error(`[DeviceRegistryService]: error deleting device:`,
          exception.error as ErrorApiResponse);
        }
        return of(false);
      })
    );

  }

}
