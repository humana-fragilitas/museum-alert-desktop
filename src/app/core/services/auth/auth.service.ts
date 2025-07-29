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
import { titleStyle } from '@shared/helpers/console.helper';

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private timeOutId: number = 0;
  private readonly sessionDataSignal = signal<Nullable<AuthSession>>(null);
  private readonly userSignal = signal<Nullable<GetCurrentUserOutput>>(null);
  private readonly userAttributesSignal = signal<Nullable<FetchUserAttributesOutput>>(null);

  readonly sessionData = this.sessionDataSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly userAttributes = this.userAttributesSignal.asReadonly();

  readonly userLoginId = computed(() => 
    this.userSignal()?.signInDetails?.loginId || ''
  );
  readonly company = computed(() => 
    this.sessionDataSignal()?.tokens?.idToken?.payload?.['custom:Company'] as string || ''
  );
  readonly hasPolicy = computed(() => 
    this.sessionDataSignal()?.tokens?.idToken?.payload?.['custom:hasPolicy'] === '1'
  );
  readonly idToken = computed(() => 
    this.sessionDataSignal()?.tokens?.idToken?.toString() || ''
  );
  readonly accessToken = computed(() => 
    this.sessionDataSignal()?.tokens?.accessToken?.toString() || ''
  );

  constructor() {

    console.log('[AuthService]: instance created');

    effect(() => {
      const user = this.userSignal();
      this.fetchSession();
      if (user) this.fetchAttributes();
    });

    Hub.listen('auth', (data: HubCapsule<string, AuthHubEventData>) => {
      const { payload } = data;
      if (payload.event == 'signedIn' ||
          payload.event == 'signedOut') {
        this.fetchUser();
      }
    });

    this.fetchUser();

  }
 
  async fetchSession(options: FetchAuthSessionOptions = { forceRefresh: false }) { 

    try {

      const session =  await fetchAuthSession(options);
      const hasSession = session.credentials &&
                         session.identityId &&
                         session.tokens &&
                         session.userSub;

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

    } catch (exception) {

      console.log(`[AuthService]: can't retrieve session data`);
      this.sessionDataSignal.set(null);

    }

  }

  async fetchUser() {

    try {

      const user = await getCurrentUser();
      console.log('[AuthService]: retrieved user data:', user);
      this.userSignal.set(user);

    } catch (exception) {

      console.log(`[AuthService]: can't retrieve user data`);
      this.userSignal.set(null);

    }

  }

  async fetchAttributes() {

    try {

      const attributes = await fetchUserAttributes();
      console.log('[AuthService]: retrieved user attributes:', attributes);
      this.userAttributesSignal.set(attributes);

    } catch (exception) {

      console.log(`[AuthService]: can't retrieve user attributes`);
      this.userAttributesSignal.set(null);

    }

  }

  // TO DO: remove this after testing
  cancelSession() {
    this.sessionDataSignal.set(null);
  }

}