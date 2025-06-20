/**
 * Eddystone URL Encoding Utilities for Angular
 * Converts C++11 Arduino functions to TypeScript for frontend validation
 */

export interface UrlEncodingResult {
  encoded: string;
  length: number;
  valid: boolean;
  debugInfo?: UrlEncodingDebugInfo;
}

export interface UrlEncodingDebugInfo {
  originalUrl: string;
  originalLength: number;
  schemePrefix: number;
  afterSchemeRemoval: string;
  afterSchemeRemovalLength: number;
  afterCompression: string;
  afterCompressionLength: number;
  finalLength: number;
  finalEncodedHex: string;
}

/**
 * Gets the URL scheme prefix according to Eddystone-URL specification
 */
export function getUrlSchemePrefix(url: string): number {
  if (url.startsWith("http://www.")) return 0x00;
  if (url.startsWith("https://www.")) return 0x01;
  if (url.startsWith("http://")) return 0x02;
  if (url.startsWith("https://")) return 0x03;
  return 0x03; // Default to https://
}

/**
 * Compresses URL by replacing common domain endings with single bytes
 */
export function compressUrl(url: string, debug: boolean = false): string {
  if (debug) {
    console.log(`Before compression: ${url}`);
  }

  let compressed = url;

  // Order matters: longer patterns first, then shorter ones
  // Test each replacement with debug logging
  const replacements = [
    // Domain endings with slash (longer patterns first)
    { pattern: '.sh/', replacement: '\x0E', name: '.sh/' },
    { pattern: '.com/', replacement: '\x00', name: '.com/' },
    { pattern: '.org/', replacement: '\x01', name: '.org/' },
    { pattern: '.edu/', replacement: '\x02', name: '.edu/' },
    { pattern: '.net/', replacement: '\x03', name: '.net/' },
    { pattern: '.info/', replacement: '\x04', name: '.info/' },
    { pattern: '.biz/', replacement: '\x05', name: '.biz/' },
    { pattern: '.gov/', replacement: '\x06', name: '.gov/' },
    { pattern: '.ly/', replacement: '\x10', name: '.ly/' },
    { pattern: '.co/', replacement: '\x12', name: '.co/' },
    
    // Domain endings without slash (shorter patterns)
    { pattern: '.sh', replacement: '\x0F', name: '.sh' },
    { pattern: '.com', replacement: '\x07', name: '.com' },
    { pattern: '.org', replacement: '\x08', name: '.org' },
    { pattern: '.edu', replacement: '\x09', name: '.edu' },
    { pattern: '.net', replacement: '\x0A', name: '.net' },
    { pattern: '.info', replacement: '\x0B', name: '.info' },
    { pattern: '.biz', replacement: '\x0C', name: '.biz' },
    { pattern: '.gov', replacement: '\x0D', name: '.gov' },
    { pattern: '.ly', replacement: '\x11', name: '.ly' },
    { pattern: '.co', replacement: '\x13', name: '.co' }
  ];

  for (const replacement of replacements) {
    if (compressed.includes(replacement.pattern)) {
      if (debug) {
        console.log(`Found ${replacement.name} - compressing`);
      }
      compressed = compressed.replace(new RegExp(escapeRegExp(replacement.pattern), 'g'), replacement.replacement);
    }
  }

  if (debug) {
    console.log(`After compression: ${compressed}`);
  }

  return compressed;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Encodes a URL according to Eddystone-URL specification
 */
export function encodeUrl(url: string, debug: boolean = false): UrlEncodingResult {
  const debugInfo: UrlEncodingDebugInfo = {
    originalUrl: url,
    originalLength: url.length,
    schemePrefix: 0,
    afterSchemeRemoval: '',
    afterSchemeRemovalLength: 0,
    afterCompression: '',
    afterCompressionLength: 0,
    finalLength: 0,
    finalEncodedHex: ''
  };

  if (debug) {
    console.log("=== URL ENCODING DEBUG ===");
    console.log(`Original URL: ${url} (length: ${url.length})`);
  }

  let encoded = "";
  let workingUrl = url;

  // Get scheme prefix
  const schemePrefix = getUrlSchemePrefix(workingUrl);
  encoded += String.fromCharCode(schemePrefix);
  debugInfo.schemePrefix = schemePrefix;

  if (debug) {
    console.log(`Scheme prefix: 0x${schemePrefix.toString(16).padStart(2, '0').toUpperCase()}`);
  }

  // Remove scheme
  if (workingUrl.startsWith("http://www.")) {
    workingUrl = workingUrl.substring(11);
  } else if (workingUrl.startsWith("https://www.")) {
    workingUrl = workingUrl.substring(12);
  } else if (workingUrl.startsWith("http://")) {
    workingUrl = workingUrl.substring(7);
  } else if (workingUrl.startsWith("https://")) {
    workingUrl = workingUrl.substring(8);
  }

  debugInfo.afterSchemeRemoval = workingUrl;
  debugInfo.afterSchemeRemovalLength = workingUrl.length;

  if (debug) {
    console.log(`After scheme removal: ${workingUrl} (length: ${workingUrl.length})`);
  }

  // Compress URL
  workingUrl = compressUrl(workingUrl, debug);
  debugInfo.afterCompression = workingUrl;
  debugInfo.afterCompressionLength = workingUrl.length;

  if (debug) {
    let compressionDisplay = "";
    for (let i = 0; i < workingUrl.length; i++) {
      const charCode = workingUrl.charCodeAt(i);
      if (charCode >= 32 && charCode <= 126) {
        compressionDisplay += workingUrl[i];
      } else {
        compressionDisplay += `[0x${charCode.toString(16).padStart(2, '0').toUpperCase()}]`;
      }
    }
    console.log(`After compression: ${compressionDisplay} (length: ${workingUrl.length})`);
  }

  encoded += workingUrl;
  debugInfo.finalLength = encoded.length;

  // Generate hex representation
  let hexString = "";
  for (let i = 0; i < encoded.length; i++) {
    hexString += encoded.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase() + " ";
  }
  debugInfo.finalEncodedHex = hexString.trim();

  if (debug) {
    console.log(`Final encoded length: ${encoded.length} bytes`);
    console.log(`Final encoded (hex): ${hexString}`);
    console.log("=========================");
  }

  const result: UrlEncodingResult = {
    encoded,
    length: encoded.length,
    valid: encoded.length <= 18, // Eddystone-URL max length
    debugInfo: debug ? debugInfo : undefined
  };

  return result;
}

/**
 * Validates if a URL can be encoded within Eddystone-URL limits
 * This is the same validator logic used in your Arduino code
 */
export function validateEddystoneUrl(url: string): { valid: boolean; encodedLength: number; error?: string } {
  try {
    const result = encodeUrl(url, false);
    
    if (result.length > 18) {
      return {
        valid: false,
        encodedLength: result.length,
        error: `URL too long after encoding: ${result.length} bytes (max 18)`
      };
    }

    return {
      valid: true,
      encodedLength: result.length
    };
  } catch (error) {
    return {
      valid: false,
      encodedLength: 0,
      error: `Encoding error: ${error}`
    };
  }
}

/**
 * Debug helper - logs detailed encoding information
 */
export function debugEncodeUrl(url: string): UrlEncodingResult {
  return encodeUrl(url, true);
}

/**
 * Gets a human-readable description of the compression applied
 */
export function getCompressionInfo(url: string): string[] {
  const compressions: string[] = [];
  
  const patterns = [
    '.com/', '.org/', '.edu/', '.net/', '.info/', '.biz/', '.gov/', '.ly/', '.co/', '.sh/',
    '.com', '.org', '.edu', '.net', '.info', '.biz', '.gov', '.ly', '.co', '.sh'
  ];

  for (const pattern of patterns) {
    if (url.includes(pattern)) {
      compressions.push(pattern);
    }
  }

  return compressions;
}

/**
 * Usage example:
 * 
 * import { encodeUrl, validateEddystoneUrl, debugEncodeUrl } from './eddystone-helpers';
 * 
 * // Basic validation
 * const validation = validateEddystoneUrl('https://dub.sh/Xb7pD5J');
 * console.log(validation); // { valid: true, encodedLength: 16 }
 * 
 * // Detailed encoding with debug
 * const result = debugEncodeUrl('https://dub.sh/Xb7pD5J');
 * console.log(`Encoded length: ${result.length}`); // Will show debug logs
 * 
 * // Silent encoding
 * const encoded = encodeUrl('https://google.com', false);
 * console.log(`Valid: ${encoded.valid}, Length: ${encoded.length}`);
 */