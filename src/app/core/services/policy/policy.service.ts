import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG } from '../../../../environments/environment';

import { AuthSession } from 'aws-amplify/auth';

import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PolicyService {

  constructor(private readonly httpClient: HttpClient, private readonly authService: AuthService) {

    this.authService.sessionData$.subscribe({
      next: (session: Nullable<AuthSession>) => {
        if (session && !this.authService.hasPolicy) {
          this.attachPolicy(session);
        }
      }
    });

  }

  async attachPolicy(session: AuthSession) {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/user-policy`;
  
    this.httpClient.post(apiUrl, null).subscribe({
        error: (e) => console.error(e),
        complete: () => {
          this.authService.fetchSession({ forceRefresh: true });
        } 
    });

  }

}
