import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { fetchAuthSession,
         FetchAuthSessionOptions,
         AuthSession,
         getCurrentUser,
         fetchUserAttributes,
         GetCurrentUserOutput,
        FetchUserAttributesOutput } from 'aws-amplify/auth';
import { Hub, HubCapsule } from '@aws-amplify/core';
import { AuthHubEventData } from '@aws-amplify/core/dist/esm/Hub/types';
import { titleStyle } from '../../../shared/helpers/console.helper';

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private timeOutId: number = 0;

  // Authentication tokens and AWS credentials
  private readonly sessionData = new BehaviorSubject<Nullable<AuthSession>>(null);
  // To be used to check if the user is authenticated
  private readonly user = new BehaviorSubject<Nullable<GetCurrentUserOutput>>(null);
  // User attributes (e.g.: email, company, etc.)
  private readonly userAttributes = new BehaviorSubject<Nullable<FetchUserAttributesOutput>>(null);

  public readonly sessionData$ = this.sessionData.asObservable();
  public readonly user$ = this.user.asObservable();
  public readonly userAttributes$ = this.userAttributes.asObservable();

  constructor() {

    console.log('[AuthService]: instance created');

    this.user.pipe(
      distinctUntilChanged()
    ).subscribe((user) => {
      this.fetchSession();
      if (user) this.fetchAttributes();
    });

    // Ref.: https://aws-amplify.github.io/amplify-js/api/types/aws_amplify.utils._Reference_Types_.AuthHubEventData.html
    Hub.listen('auth', (data: HubCapsule<string, AuthHubEventData>) => {

      const { payload } = data;
      if (payload.event == 'signedIn' ||
          payload.event == 'signedOut') {
        this.fetchUser();
      }

    });

    this.fetchUser();

  }
 
  fetchSession(
    options: FetchAuthSessionOptions = { forceRefresh: false }
  ): void {

    fetchAuthSession(options).then(
      (session: AuthSession) => {

        /**
         * Note: fetchAuthSession() function returns the AuthSession
         * object with all properties set to undefined when a session does
         * not exist
         */

        const hasSession = session.credentials &&
                           session.identityId &&
                           session.tokens &&
                           session.userSub;

        this.sessionData.next(hasSession ? session : null);

        if (this.timeOutId) { clearTimeout(this.timeOutId); }

        if (!hasSession) {
           console.log('[AuthService]: no session data available');
          return;
        }

        console.log('[AuthService]: session data:');
        console.log(session);
        
        console.log('%c[AuthService]: access token:', titleStyle);
        console.log(this.accessToken);

        console.log('%c[AuthService]: id token:', titleStyle);
        console.log(this.idToken);

        console.log(`[AuthService]: user session is set to expire at: ${session.credentials!.expiration}`);

        const sessionRefreshInterval = (session.credentials!.expiration!.getTime() -
            new Date().getTime()) - (1000 * 60);

        const hours = Math.floor(sessionRefreshInterval / (1000 * 60 * 60));
        const minutes = Math.floor((sessionRefreshInterval % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((sessionRefreshInterval % (1000 * 60)) / 1000);  

        console.log(`[AuthService]: user session set to be automatically refreshed in ${hours} hours, ${minutes} minutes, ${seconds} seconds`);

        // Note: typings point to NodeJS.Timeout
        this.timeOutId = Number(setTimeout(
          () => this.fetchSession({ forceRefresh: true }),
          sessionRefreshInterval
        ));

      },
      () => {
        console.log(`[AuthService]: can't retrieve session data`);
        this.sessionData.next(null);
      }
    );

  }

  fetchUser() {

    getCurrentUser().then(
      (user: GetCurrentUserOutput) => {
        console.log('[AuthService]: retrieved user data:');
        console.log(user);
        this.user.next(user);
      },
      () => {
        console.log(`[AuthService]: can't retrieve user data`);
        this.user.next(null);
      }
    );

  }

  fetchAttributes() {

    return fetchUserAttributes().then(
      (attributes: FetchUserAttributesOutput) => {
        console.log('[AuthService]: retrieved user attributes:');
        console.log(attributes);
        this.userAttributes.next(attributes);
      },
      () => {
        console.log(`[AuthService]: can't retrieve user attributes`);
        this.userAttributes.next(null);
      }
    );

  }

  get userLoginId(): string {

    return this.user
               .getValue()
              ?.signInDetails
              ?.loginId || '';

  }

  get company(): string {

    return this.session
              ?.tokens
              ?.idToken
              ?.payload
              ?.['custom:Company'] as string;

  }

  get hasPolicy(): boolean {

    return this.session
              ?.tokens
              ?.idToken
              ?.payload
              ?.['custom:hasPolicy'] === '1';

  }

  get session(): Nullable<AuthSession> {

    return this.sessionData.getValue();

  }

  get idToken(): string {

    return this.session
              ?.tokens
              ?.idToken
              ?.toString() || '';

  }

  get accessToken(): string {

    return this.session
              ?.tokens
              ?.accessToken
              ?.toString() || '';

  }

}
