import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { AuthSession } from 'aws-amplify/auth';
import { firstValueFrom } from 'rxjs';

import { Injectable,
         effect } from '@angular/core';
import { HttpClient,
         HttpErrorResponse } from '@angular/common/http';

import { APP_CONFIG } from '@env/environment';
import { AuthService } from '@services/auth/auth.service';
import { ApiResult,
         ErrorApiResponse,
         SuccessApiResponse,
         AttachPolicyResponse } from '@models';
import { ErrorService } from '@services/error/error.service';
import { DialogType } from '@models/ui.models';
import { AuthenticationExpiredError } from '@interceptors/auth-token.interceptor';


@Injectable({
  providedIn: 'root'
})
export class PolicyService {

  private readonly sessionDataSignal = this.authService.sessionData;

  constructor(
    private readonly httpClient: HttpClient, 
    private readonly authService: AuthService,
    private readonly errorService: ErrorService,
    private readonly authenticatorService: AuthenticatorService
  ) {

    effect(() => {
      const session = this.sessionDataSignal();
      if (session && !this.authService.hasPolicy()) {
        console.log(`[PolicyService]: authenticated user has no IoT policy attached`);
        this.attachPolicyWithRetry(session);
      }
    });

  }

  async attachPolicy(
    session: AuthSession, 
    maxRetries: number = 10, 
    baseDelay: number = 1000
  ): Promise<ApiResult<AttachPolicyResponse>> {
    
    let attempt = 0;

    const attemptAttach = async (): Promise<ApiResult<AttachPolicyResponse>> => {

      try {

        attempt++;
        console.log(
          `[PolicyService]: attempting to attach IoT policy to authenticated user; ` +
          `attempt number: ${attempt}/${maxRetries}`
        );

        const apiUrl = `${APP_CONFIG.aws.apiGateway}/user-policy`;
        const response = await firstValueFrom(
          this.httpClient.post<ApiResult<AttachPolicyResponse>>(apiUrl, null)
        );

        console.log(
          `[PolicyService]: successfully attached IoT policy to authenticated user:`,
          (response as SuccessApiResponse<AttachPolicyResponse>).data
        );

        return response;

      } catch (error) {

        const httpError = error as HttpErrorResponse;
        console.log(
          `[PolicyService]: error occurred while attaching IoT policy (attempt ${attempt}/${maxRetries}):`,
          httpError.error as ErrorApiResponse
        );

        if (attempt >= maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[PolicyService]: retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return attemptAttach();

      }
      
    };

    try {
      const result = await attemptAttach();
      // Always refresh session after successful policy attachment
      this.authService.fetchSession({ forceRefresh: true });
      return result;
    } catch (error) {
      console.error(
        `[PolicyService]: failed to attach IoT policy after ${maxRetries} attempts:`,
        error
      );
      throw error;
    }

  }

  private async attachPolicyWithRetry(
    session: AuthSession,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<void> {

    let attempt = 0;

    const attemptAttach = async (): Promise<ApiResult<AttachPolicyResponse>> => {
      try {
        attempt++;
        console.log(
          `[PolicyService]: attempting to attach IoT policy to authenticated user; ` +
          `attempt number: ${attempt}/${maxRetries}`
        );

        const apiUrl = `${APP_CONFIG.aws.apiGateway}/user-policy`;
        
        // Convert Observable to Promise for consistent async/await pattern
        const response = await firstValueFrom(
          this.httpClient.post<ApiResult<AttachPolicyResponse>>(apiUrl, null)
        );

        // Success - refresh session and log
        await this.authService.fetchSession({ forceRefresh: true });
        console.log(
          `[PolicyService]: successfully attached IoT policy to authenticated user:`,
          (response as SuccessApiResponse<AttachPolicyResponse>).data
        );

        return response;

      } catch (error) {
        const httpError = error as HttpErrorResponse;
        console.log(
          `[PolicyService]: error occurred while attaching IoT policy (attempt ${attempt}/${maxRetries}):`,
          httpError.error as ErrorApiResponse
        );

        if (attempt >= maxRetries) {
          throw error; // Re-throw after max retries
        }

        // Exponential backoff: wait longer between each retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[PolicyService]: retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return attemptAttach(); // Recursive retry
      }
    };

    try {
      await attemptAttach();
    } catch (exception) {
      console.error(
        `[PolicyService]: failed to attach IoT policy after ${maxRetries} attempts:`,
        exception
      );
      this.errorService.showModal({
        data: {
          type: DialogType.ERROR,
          title: 'ERRORS.APPLICATION.IOT_POLICY_ATTACHMENT_FAILED_TITLE',
          message: 'ERRORS.APPLICATION.IOT_POLICY_ATTACHMENT_FAILED_MESSAGE'
        },
        exception: exception as HttpErrorResponse | AuthenticationExpiredError,
        onClosed: () => {
          this.authenticatorService.signOut();
        }
      });
    }
    
  }

}