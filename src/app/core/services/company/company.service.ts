import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService
  ) { }
 
  setName(companyName: string): Observable<any> {

    const companyId =  this.authService
                           .sessionData
                           .getValue()
                           ?.tokens
                           ?.idToken
                           ?.payload['custom:Company'];

     const apiUrl = `${APP_CONFIG.aws.apiGateway}/companies/${companyId}/`;

     return this.httpClient.put(apiUrl, { companyName });

  }

  get(): Observable<any> {

    const companyId = this.authService
                          .sessionData
                          .getValue()
                          ?.tokens
                          ?.idToken
                          ?.payload['custom:Company'];

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/companies/${companyId}/`;

    return this.httpClient.get(apiUrl);

  }

}
