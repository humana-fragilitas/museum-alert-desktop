import { Injectable } from '@angular/core';

import { APP_CONFIG } from '../../../../environments/environment';

import { HmacSHA256, SHA256, enc } from 'crypto-js';
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc';

import WordArray = CryptoJS.lib.WordArray;
import { AuthSession } from 'aws-amplify/auth';

@Injectable({
  providedIn: 'root'
})
export class SigV4Service {

  constructor() { }

  sign(key: string | WordArray, msg: string | WordArray): string {
    const hash = HmacSHA256(msg, key);
    return hash.toString(enc.Hex);
  }

  sha256(msg: string | WordArray): string {
    const hash = SHA256(msg);
    return hash.toString(enc.Hex);
  }

  getSignatureKey(
    key: string | WordArray,
    dateStamp: string | WordArray,
    regionName: string | WordArray,
    serviceName: string | WordArray
  ): WordArray {
    const kDate = HmacSHA256(dateStamp, `AWS4${key}`);
    const kRegion = HmacSHA256(regionName, kDate);
    const kService = HmacSHA256(serviceName, kRegion);
    const kSigning = HmacSHA256('aws4_request', kService);

    return kSigning;
  }

  getSignedURL(sessionData: AuthSession): string {
    const host = APP_CONFIG.aws.IoTCore.endpoint;
    const algorithm = APP_CONFIG.aws.algorithm;
    const service = APP_CONFIG.aws.IoTCore.service;
    const region = APP_CONFIG.aws.region;
    const method = 'GET';
    const canonicalUri = '/mqtt';

    dayjs.extend(utc);
    const time = dayjs.utc();
    const dateStamp = time.format('YYYYMMDD');
    const amzdate = `${dateStamp}T${time.format('HHmmss')}Z`;

    const {
      credentials: {
        secretAccessKey,
        accessKeyId,
        sessionToken
      } = {},
      identityId: clientId
    } = sessionData;

    console.log('[SigV4Service]: secretAccessKey:', secretAccessKey);
    console.log('[SigV4Service]: accessKeyId:', accessKeyId);
    console.log('[SigV4Service]: sessionToken:', sessionToken);
    console.log('[SigV4Service]: clientId:', clientId);

    // Set credential scope
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    // Create base URL
    const baseUrl = new URL(`wss://${host}${canonicalUri}`);
    
    // Build query parameters using URLSearchParams
    const queryParams = new URLSearchParams();
    queryParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
    queryParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`);
    queryParams.set('X-Amz-Date', amzdate);
    queryParams.set('X-Amz-Expires', '86400');
    queryParams.set('X-Amz-SignedHeaders', 'host');

    // Get canonical query string (sorted by parameter name for AWS SigV4)
    const sortedParams = Array.from(queryParams.entries())
      .sort(([a], [b]) => a.localeCompare(b));
    
    const canonicalQuerystring = sortedParams
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty string hash

    // Build canonical request
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      'host',
      payloadHash
    ].join('\n');

    console.log('[SigV4Service]: canonicalRequest:', canonicalRequest);

    // Create string to sign
    const stringToSign = [
      algorithm,
      amzdate,
      credentialScope,
      this.sha256(canonicalRequest)
    ].join('\n');

    // Generate signing key and signature
    const signingKey = this.getSignatureKey(secretAccessKey!, dateStamp, region, service);
    console.log('[SigV4Service]: stringToSign:', stringToSign);
    console.log('[SigV4Service]: signingKey:', signingKey);

    const signature = this.sign(signingKey, stringToSign);

    // Add signature to query parameters
    queryParams.set('X-Amz-Signature', signature);

    // Add session token if present
    if (sessionToken) {
      queryParams.set('X-Amz-Security-Token', sessionToken);
    }

    // Build final URL
    baseUrl.search = queryParams.toString();
    const requestUrl = baseUrl.toString();

    console.dir(requestUrl);

    return requestUrl;
  }
}