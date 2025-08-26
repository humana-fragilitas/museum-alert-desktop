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
import { titleStyle } from '@shared/helpers/console.helper';
import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';

// Ref.: https://dev.to/beavearony/aws-amplify-auth-angular-rxjs-simple-state-management-3jhd
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private timeOutId: number = 0;
  private isFetchingSession = false;
  private sessionRefreshInterval: number = 0;
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
          this.refreshSessionOnTokenExpiry();
        });
      });
      
      // win.electron.ipcRenderer.on(MainProcessEvent.WINDOW_FOCUSED, () => {
      //   this.ngZone.run(() => {
      //     console.log('[AuthService]: window focused');
      //     this.onFocusResume(MainProcessEvent.WINDOW_FOCUSED);
      //   });
      // });

      // win.electron.ipcRenderer.on(MainProcessEvent.SYSTEM_RESUMED, () => {
      //   this.ngZone.run(() => {
      //     console.log('[AuthService]: system resumed');
      //     this.onFocusResume(MainProcessEvent.SYSTEM_RESUMED);
      //   });
      // });

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

    this.fetchSession();

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

      // Clear existing timeout
      if (this.timeOutId) { 
        clearTimeout(this.timeOutId); 
        this.timeOutId = 0;
      }

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

      this.sessionRefreshInterval = Math.max((session.credentials!.expiration!.getTime() -
          new Date().getTime()) - (1000 * 60), 1000);

    } catch (exception) {

      console.log(`[AuthService]: can't retrieve session data`, exception);
      this.sessionDataSignal.set(null);

    } finally {

      this.isFetchingSession = false;
      const hours = Math.floor(this.sessionRefreshInterval / (1000 * 60 * 60));
      const minutes = Math.floor((this.sessionRefreshInterval % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((this.sessionRefreshInterval % (1000 * 60)) / 1000);  
      console.log(`[AuthService]: user session set to be automatically refreshed in ${hours} hours, ${minutes} minutes, ${seconds} seconds`);
      // this.timeOutId = Number(setTimeout(
      //   () => {
      //     console.log('[AuthService]: auto-refreshing session...');
      //     this.fetchSession({ forceRefresh: true });
      //   },
      //   this.sessionRefreshInterval
      // ));

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

  // Clean up resources
  destroy() {
    if (this.timeOutId) {
      clearTimeout(this.timeOutId);
      this.timeOutId = 0;
    }
  }

  // TO DO: remove this after testing
  cancelSession() {
    this.sessionDataSignal.set(null);
  }

  onFocusResume(event: MainProcessEvent) {

    if (event === MainProcessEvent.WINDOW_FOCUSED) {
      if (this.sessionRefreshInterval < (60 * 1000)) {
        console.log('[AuthService]: app focus detected near session expiration; refreshing session...');
        this.fetchSession();
      } 
    }

    if (event === MainProcessEvent.SYSTEM_RESUMED) {
      console.log('[AuthService]: app resume detected; refreshing session...');
      this.fetchSession({ forceRefresh: true });
    }

  }

  isSessionTokenExpired(): boolean {
    return (this.sessionData()?.credentials?.expiration?.getTime() || 0 -
            new Date().getTime()) <= 0;
  }

  refreshSessionOnTokenExpiry() {
    if (this.isSessionTokenExpired()) {
      console.log('[AuthService]: user session is expired; refreshing session...');
      this.fetchSession({ forceRefresh: true });
    }
  }

}
