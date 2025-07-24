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

import { Injectable, signal, computed, effect } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { titleStyle } from '@shared/helpers/console.helper';

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private timeOutId: number = 0;

  // Convert BehaviorSubjects to signals
  private readonly sessionDataSignal = signal<Nullable<AuthSession>>(null);
  private readonly userSignal = signal<Nullable<GetCurrentUserOutput>>(null);
  private readonly userAttributesSignal = signal<Nullable<FetchUserAttributesOutput>>(null);

  // Maintain backward compatibility with observables
  public readonly sessionData$ = toObservable(this.sessionDataSignal);
  public readonly user$ = toObservable(this.userSignal);
  public readonly userAttributes$ = toObservable(this.userAttributesSignal);

  // Convert getters to computed signals
  public readonly userLoginId = computed(() => 
    this.userSignal()?.signInDetails?.loginId || ''
  );

  public readonly company = computed(() => 
    this.sessionDataSignal()?.tokens?.idToken?.payload?.['custom:Company'] as string || ''
  );

  public readonly hasPolicy = computed(() => 
    this.sessionDataSignal()?.tokens?.idToken?.payload?.['custom:hasPolicy'] === '1'
  );

  public readonly idToken = computed(() => 
    this.sessionDataSignal()?.tokens?.idToken?.toString() || ''
  );

  public readonly accessToken = computed(() => 
    this.sessionDataSignal()?.tokens?.accessToken?.toString() || ''
  );

  // Computed signal to replace the session getter
  public readonly session = computed(() => this.sessionDataSignal());

  readonly user = this.userSignal.asReadonly();

  constructor() {

    console.log('[AuthService]: instance created');

    // Replace subscription with effect
    effect(() => {
      const user = this.userSignal();
      this.fetchSession();
      if (user) this.fetchAttributes();
    });

    // Keep the Hub listener as-is since it's external integration
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

        // Update signal instead of BehaviorSubject
        this.sessionDataSignal.set(hasSession ? session : null);

        if (this.timeOutId) { clearTimeout(this.timeOutId); }

        if (!hasSession) {
           console.log('[AuthService]: no session data available');
          return;
        }

        console.log('[AuthService]: session data:');
        console.log(session);
        
        console.log('%c[AuthService]: access token:', titleStyle);
        console.log(this.accessToken());

        console.log('%c[AuthService]: id token:', titleStyle);
        console.log(this.idToken());

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
        // Update signal instead of BehaviorSubject
        this.sessionDataSignal.set(null);
      }
    );

  }

  fetchUser() {

    getCurrentUser().then(
      (user: GetCurrentUserOutput) => {
        console.log('[AuthService]: retrieved user data:');
        console.log(user);
        // Update signal instead of BehaviorSubject
        this.userSignal.set(user);
      },
      () => {
        console.log(`[AuthService]: can't retrieve user data`);
        // Update signal instead of BehaviorSubject
        this.userSignal.set(null);
      }
    );

  }

  fetchAttributes() {

    return fetchUserAttributes().then(
      (attributes: FetchUserAttributesOutput) => {
        console.log('[AuthService]: retrieved user attributes:');
        console.log(attributes);
        // Update signal instead of BehaviorSubject
        this.userAttributesSignal.set(attributes);
      },
      () => {
        console.log(`[AuthService]: can't retrieve user attributes`);
        // Update signal instead of BehaviorSubject
        this.userAttributesSignal.set(null);
      }
    );

  }

}