import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { fetchAuthSession, FetchAuthSessionOptions, AuthSession } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { HubCapsule } from 'aws-amplify/utils';

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  readonly sessionData = new BehaviorSubject<AuthSession | null>(
    null
  );

  readonly sessionData$ = this.sessionData.asObservable();

  constructor() {

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

      },
      () => {

        console.log('[AuthService]: can\'t retrieve session data');
        this.sessionData.next(null);

      }
    );

  }

}
