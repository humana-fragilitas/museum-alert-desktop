import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { fetchAuthSession, FetchAuthSessionOptions, AuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { APP_CONFIG } from '../../../../environments/environment';
import { Hub, HubCapsule } from '@aws-amplify/core';
import { AuthHubEventData } from '@aws-amplify/core/dist/esm/Hub/types';
import { titleStyle } from '../../../shared/helpers/console.helper';

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private timeOutId: number = 0;

  readonly sessionData = new BehaviorSubject<Nullable<AuthSession>>(
    null
  );

  constructor() {

    Amplify.configure(APP_CONFIG.aws.amplify); 

    this.fetchSession();

    // Ref.: https://aws-amplify.github.io/amplify-js/api/types/aws_amplify.utils._Reference_Types_.AuthHubEventData.html
    Hub.listen('auth', (data: HubCapsule<string, AuthHubEventData>) => {
      const { payload } = data;

      if (payload.event == 'signedIn' ||
          payload.event == 'signedOut') {
        this.fetchSession();
      }

    });

  }
 
  fetchSession(
    options: FetchAuthSessionOptions = { forceRefresh: false }
  ): void {

    fetchAuthSession(options).then(
      (session: AuthSession) => {

        /**
         * Note: oddly, the fetchAuthSession() function returns the AuthSession
         * object with all properties set to undefined when a session does
         *  not exist.
         */

        const hasSession = session.credentials &&
                           session.identityId &&
                           session.tokens &&
                           session.userSub;

        this.sessionData.next(hasSession ? session : null);

        console.log('[AuthService]: session data:');
        console.log(session);
        
        console.log('%cAccess token:', titleStyle);
        console.log(session.tokens?.accessToken.toString());

        console.log('%cId token:', titleStyle);
        console.log(session.tokens?.idToken?.toString());

        if (this.timeOutId) { clearTimeout(this.timeOutId); }

        if (!hasSession) return;

        console.log(`User session is set to expire at: ${session.credentials!.expiration}`);

        const sessionRefreshInterval = (session.credentials!.expiration!.getTime() -
            new Date().getTime()) - (1000 * 60);

        const hours = Math.floor(sessionRefreshInterval / (1000 * 60 * 60));
        const minutes = Math.floor((sessionRefreshInterval % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((sessionRefreshInterval % (1000 * 60)) / 1000);  

        console.log(`User session set to be automatically refreshed in ${hours} hours, ${minutes} minutes, ${seconds} seconds`);

        // Note: typings point to NodeJS.Timeout
        this.timeOutId = Number(setTimeout(
          () => this.fetchSession({ forceRefresh: true }),
          sessionRefreshInterval
        ));

      },
      () => {

        console.log('[AuthService]: can\'t retrieve session data');
        this.sessionData.next(null);

      }
    );

  }

}
