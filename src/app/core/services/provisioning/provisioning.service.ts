import { map, Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { APP_CONFIG } from '@env/environment';
import { AuthService } from '@services/auth/auth.service';
import { ApiResult,
         ProvisioningClaimResponse } from '@models';


@Injectable({
  providedIn: 'root'
})
export class ProvisioningService {

  constructor(private httpClient: HttpClient,
              private authService: AuthService) { }

  createClaim(): Observable<ApiResult<ProvisioningClaimResponse>> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/provisioning-claims/`;
    return this.httpClient.post(apiUrl, null).pipe(
      map((response: any) => ({
        ...response,
        idToken: this.authService.idToken()
      }))
    );

  }

}
