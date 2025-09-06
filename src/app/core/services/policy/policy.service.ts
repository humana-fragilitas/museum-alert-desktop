import { firstValueFrom } from 'rxjs';

import { Injectable } from '@angular/core';
import { HttpClient,
         HttpErrorResponse } from '@angular/common/http';

import { APP_CONFIG } from '@env/environment';
import { ApiResult,
         ErrorApiResponse,
         SuccessApiResponse,
         AttachPolicyResponse } from '@models';


@Injectable({
  providedIn: 'root'
})
export class PolicyService {

  constructor(private readonly httpClient: HttpClient) { }

  async attachPolicy(maxRetries: number = 10, 
                     baseDelay: number = 1000): Promise<ApiResult<AttachPolicyResponse>> {
    
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
      return result;
    } catch (error) {
      console.error(
        `[PolicyService]: failed to attach IoT policy after ${maxRetries} attempts:`,
        error
      );
      throw error;
    }

  }

}