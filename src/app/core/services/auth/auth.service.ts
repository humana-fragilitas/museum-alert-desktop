import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { fetchAuthSession, FetchAuthSessionOptions, AuthSession } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { HubCapsule } from 'aws-amplify/utils';
import { Amplify } from 'aws-amplify';
import { APP_CONFIG } from '../../../../environments/environment';

/**
 * humana.fragilitas@gmail.com
 * zZ&c0qIz
 */

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private timeOutID: number = 0;

  readonly sessionData = new BehaviorSubject<AuthSession | null>(
    null
  );

  constructor() {

    Amplify.configure(APP_CONFIG.aws.amplify); 

    this.fetchSession();

    // https://aws-amplify.github.io/amplify-js/api/types/aws_amplify.utils._Reference_Types_.AuthHubEventData.html
    // Use Hub channel 'auth' to get notified on changes
    Hub.listen('auth', () => this.fetchSession());

  }
 
  fetchSession(options: FetchAuthSessionOptions = { forceRefresh: false }): void {

    fetchAuthSession(options).then(
      (session: AuthSession) => {

        console.log('[AuthService]: session data:');

        /**
         * Note: oddly, the fetchAuthSession() function returns the AuthSession object
         * with all properties set to undefined when a session does not exist.
         */

        this.sessionData.next(
          (session.credentials &&
           session.identityId &&
           session.tokens &&
           session.userSub) ? session : null
        );

        console.log(session);
        
        console.log('ACCESS TOKEN -----------------------');
        console.log(session.tokens?.accessToken.toString());
        console.log('ACCESS TOKEN -----------------------');

        console.log('ID TOKEN -----------------------');
        console.log(session.tokens?.idToken?.toString());
        console.log('ID TOKEN -----------------------');

        console.log(`User session is set to expire at: ${session.credentials!.expiration}`);

        if (this.timeOutID) { clearTimeout(this.timeOutID); }

        const sessionRefreshInterval = (session.credentials!.expiration!.getTime() -
            new Date().getTime()) - (1000 * 60);

        const hours = Math.floor(sessionRefreshInterval / (1000 * 60 * 60));
        const minutes = Math.floor((sessionRefreshInterval % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((sessionRefreshInterval % (1000 * 60)) / 1000);  

        console.log(`User session set to be automatically refreshed in ${hours} hours, ${minutes} minutes, ${seconds} seconds`);

        this.timeOutID = Number(setTimeout(() => this.fetchSession(), sessionRefreshInterval));

      },
      () => {
        console.log('[AuthService]: can\'t retrieve session data');
        this.sessionData.next(null);
      }
    );

  }

}
