import { Injectable } from '@angular/core';

import { HmacSHA256, SHA256, enc } from 'crypto-js';

import WordArray = CryptoJS.lib.WordArray;

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

}
