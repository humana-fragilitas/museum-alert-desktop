import { fetchAuthSession,
         FetchAuthSessionOptions,
         AuthSession,
         getCurrentUser,
         fetchUserAttributes,
         GetCurrentUserOutput,
         FetchUserAttributesOutput } from 'aws-amplify/auth';
import { Hub, HubCapsule } from '@aws-amplify/core';
import { AuthHubEventData } from '@aws-amplify/core/dist/esm/Hub/types';

import { Injectable, signal, computed, effect, NgZone, Inject } from '@angular/core';
import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';
import { msToHMS } from '@shared/helpers/milliseconds-to-readable-time.helper';

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isFetchingSession = false;
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

  constructor(@Inject(WINDOW) private win: Window,
                              private ngZone: NgZone) {

    console.log('[AuthService]: instance created');

    if (win.electron) {

      win.electron.ipcRenderer.on(MainProcessEvent.SESSION_CHECK, () => {
        this.ngZone.run(() => {
          console.log('[AuthService]: session check received');
              if (this.isSessionTokenExpired()) {
                console.log('[AuthService]: user session is expired; refreshing session...');
                this.fetchSession({ forceRefresh: true });
              }
        });
      });

    }

    effect(() => {
      const session = this.sessionDataSignal();
      if (session) {
        this.fetchUser();
      } else {
        this.userSignal.set(null);
        this.userAttributesSignal.set(null);
      }
    });

    effect(() => {
      const user = this.userSignal();
      if (user) this.fetchAttributes();
    });

    Hub.listen('auth', (data: HubCapsule<string, AuthHubEventData>) => {
      const { payload } = data;
      if (payload.event == 'signedIn' ||
          payload.event == 'signedOut') {
        this.fetchSession();
      } 
    });

  }
 
  async fetchSession(options: FetchAuthSessionOptions = { forceRefresh: false }) { 

    // Prevent concurrent session fetches
    if (this.isFetchingSession) {
      console.log('[AuthService]: session fetch already in progress, skipping...');
      return;
    }

    this.isFetchingSession = true;

    try {

      const session = await fetchAuthSession(options);
      const hasSession = session.credentials &&
                         session.identityId &&
                         session.tokens &&
                         session.userSub;

      this.sessionDataSignal.set(hasSession ? session : null);

      if (!hasSession) {
        console.log('[AuthService]: no session data available');
        return;
      }

      console.log('[AuthService]: session data:', session);
      console.log('[AuthService]: access token:', this.accessToken());
      console.log('[AuthService]: id token:', this.idToken());
      console.log(`[AuthService]: user session is set to expire at: ${session.credentials!.expiration}`);

    } catch (exception) {

      console.log(`[AuthService]: can't retrieve session data`, exception);
      this.sessionDataSignal.set(null);

    } finally {

      this.isFetchingSession = false;
      const refreshTime = msToHMS(this.accessTokenExpirationTimeMS());
      console.log(`[AuthService]: user session will be refreshed in ${refreshTime.h} hours, ${refreshTime.m} minutes, ${refreshTime.s} seconds`);

    }

  }

  async fetchUser() {

    try {

      const user = await getCurrentUser();
      console.log('[AuthService]: retrieved user data:', user);
      this.userSignal.set(user);

    } catch (exception) {

      console.log(`[AuthService]: can't retrieve user data`, exception);
      this.userSignal.set(null);

    }

  }

  async fetchAttributes() {

    try {

      const attributes = await fetchUserAttributes();
      console.log('[AuthService]: retrieved user attributes:', attributes);
      this.userAttributesSignal.set(attributes);

    } catch (exception) {

      console.log(`[AuthService]: can't retrieve user attributes`, exception);
      this.userAttributesSignal.set(null);

    }

  }

  // TO DO: remove this after testing
  cancelSession() {
    this.sessionDataSignal.set(null);
  }

  isSessionTokenExpired(): boolean {

    console.log('[AuthService]: checking if session token is expired...');
    const timeToExpiration = this.accessTokenExpirationTimeMS();
    const refreshTime = msToHMS(timeToExpiration);
    console.log(`[AuthService]: user session will be refreshed in ${refreshTime.h} hours, ${refreshTime.m} minutes, ${refreshTime.s} seconds`);
    const isExpired = timeToExpiration === 0;
    console.log(`[AuthService]: session token is ${isExpired ? '' : 'not '}expired`);
    return isExpired;

  }

  accessTokenExpirationTimeMS(): number {
    const expirationTime = this.sessionData()?.credentials?.expiration?.getTime() || 0;
    return Math.max(expirationTime - new Date().getTime(), 0);
  }

}
