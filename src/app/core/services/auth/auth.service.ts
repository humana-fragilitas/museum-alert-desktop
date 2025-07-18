import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { fetchAuthSession,
         FetchAuthSessionOptions,
         AuthSession,
         getCurrentUser,
         fetchUserAttributes,
         GetCurrentUserOutput,
        FetchUserAttributesOutput } from 'aws-amplify/auth';
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

  // To be used only to retrieve authentication tokens and AWS credentials
  readonly sessionData = new BehaviorSubject<Nullable<AuthSession>>(
    null
  );
  // To be used to check if the user is authenticated
  private readonly user = new BehaviorSubject<Nullable<GetCurrentUserOutput>>(null);
  // To be used to retrieve user attributes (e.g.: email, company, etc.)
  private readonly userAttributes = new BehaviorSubject<Nullable<FetchUserAttributesOutput>>(null);

  public readonly sessionData$ = this.sessionData.asObservable();
  public readonly user$ = this.user.asObservable();
  public readonly userAttributes$ = this.userAttributes.asObservable();

  constructor() {

    console.log('AuthService instance created');

    Amplify.configure(APP_CONFIG.aws.amplify);

    this.user.pipe(
      distinctUntilChanged()
    ).subscribe((user) => {

      this.fetchSession();

      if (user) {
        this.getUserAttributes();
      }

    });

    // Ref.: https://aws-amplify.github.io/amplify-js/api/types/aws_amplify.utils._Reference_Types_.AuthHubEventData.html
    Hub.listen('auth', (data: HubCapsule<string, AuthHubEventData>) => {
      const { payload } = data;

      if (payload.event == 'signedIn' ||
          payload.event == 'signedOut') {

        this.getUser();

      }

    });

    this.getUser();

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

  getUser() {

    getCurrentUser().then(
      (user: GetCurrentUserOutput) => {
        console.log('[AuthService]: retrieved user data:');
        console.log(user);
        this.user.next(user);
      },
      () => {
        console.log('[AuthService]: can\'t retrieve user data');
        this.user.next(null);
      }
    );

  }

  getUserAttributes() {

    return fetchUserAttributes().then(
      (attributes: FetchUserAttributesOutput) => {
        console.log('[AuthService]: retrieved user attributes:');
        console.log(attributes);
        this.userAttributes.next(attributes);
      },
      () => {
        console.log('[AuthService]: can\'t retrieve user attributes');
        this.userAttributes.next(null);
      }
    );

  }

  get userLoginId(): string {

    return this.user.getValue()?.signInDetails?.loginId || '';

  }

}
