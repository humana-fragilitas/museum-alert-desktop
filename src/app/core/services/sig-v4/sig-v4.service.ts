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

    dayjs.extend(utc)
    const time = dayjs.utc();
    const dateStamp = time.format('YYYYMMDD');
    const amzdate = `${dateStamp}T${time.format('HHmmss')}Z`;

    const {
      credentials: {
        secretAccessKey: secretAccessKey,
        accessKeyId: accessKeyId,
        sessionToken: sessionToken
      } = {},
      identityId: clientId
    } = sessionData;

    console.log('[SigV4Service]: secretAccessKey:', secretAccessKey);
    console.log('[SigV4Service]: accessKeyId:', accessKeyId);
    console.log('[SigV4Service]: sessionToken:', sessionToken);
    console.log('[SigV4Service]: clientId:', clientId);

    // Set credential scope to today for a specific service in a specific region
    var credentialScope = dateStamp + '/' + region + '/' + service + '/' + 'aws4_request';

    // Start populating the query string
    var canonicalQuerystring = 'X-Amz-Algorithm=AWS4-HMAC-SHA256';

    // Add credential information
    canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(accessKeyId + '/' + credentialScope);

    // Add current date
    canonicalQuerystring += '&X-Amz-Date=' + amzdate;

    // Add expiry date
    canonicalQuerystring += '&X-Amz-Expires=86400';

    // Add headers, only using one = host
    canonicalQuerystring += '&X-Amz-SignedHeaders=host';
    var canonicalHeaders = 'host:' + host + '\n';

    // No payload, empty
    var payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty string -> echo -n "" | xxd  | shasum -a 256

    // Build canonical request
    var canonicalRequest = method + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;
    console.log('[SigV4Service]: canonicalRequest:', canonicalRequest);

    // Hash the canonical request and create the message to be signed
    var stringToSign = algorithm + '\n' +  amzdate + '\n' +  credentialScope + '\n' +  this.sha256(canonicalRequest);

    // Derive the key to be used for the signature based on the scoped down request
    var signingKey = this.getSignatureKey(secretAccessKey!, dateStamp, region, service);
    console.log('[SigV4Service]: stringToSign:', stringToSign);
    console.log('[SigV4Service]: signingKey:', signingKey);

    // Calculate signature
    var signature = this.sign(signingKey, stringToSign);

    // Append signature to message
    canonicalQuerystring += '&X-Amz-Signature=' + signature;

    // Append existing security token to the request (since we are using STS credetials) or do nothing if using IAM credentials
    if (sessionToken !== "") {
      canonicalQuerystring += '&X-Amz-Security-Token=' + encodeURIComponent(sessionToken!);  
    } 
    
    const requestUrl = 'wss://' + host + canonicalUri + '?' + canonicalQuerystring;

    console.dir(requestUrl);

    return requestUrl;

  }

}
