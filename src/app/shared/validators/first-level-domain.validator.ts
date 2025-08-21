import { AbstractControl,
         ValidationErrors,
         ValidatorFn } from '@angular/forms';

/**
 * Custom validator that checks if a URL has an allowed first-level domain
 * Allowed domains: .com, .org, .edu, .net, .info, .biz, .gov, .ly, .co, .sh
 * Only accepts HTTP/HTTPS URLs or domain names without protocol
 */
export function firstLevelDomainValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values (use required validator for that)
    }

    const allowedDomains = [
      '.com', '.org', '.edu', '.net', '.info', 
      '.biz', '.gov', '.ly', '.co', '.sh'
    ];

    const value = control.value.toString().toLowerCase();
    
    // Check for non-HTTP/HTTPS protocols
    if (value.startsWith('ftp:') || 
        value.startsWith('mailto:') || 
        value.startsWith('file:') || 
        value.startsWith('ssh:') || 
        value.startsWith('telnet:') || 
        value.startsWith('ldap:') || 
        value.startsWith('news:') || 
        value.startsWith('gopher:') || 
        value.startsWith('wais:') ||
        (value.includes('://') && !value.startsWith('http://') && !value.startsWith('https://'))) {
      return { 
        firstLevelDomain: { 
          value: control.value, 
          error: 'Only HTTP and HTTPS URLs are allowed',
          allowedDomains 
        } 
      };
    }
    
    try {
      // Extract domain from URL
      let domain: string;
      
      if (value.startsWith('http://') || value.startsWith('https://')) {
        const url = new URL(value);
        domain = url.hostname;
      } else {
        // Handle cases without protocol
        domain = value.split('/')[0];
        // Remove port, query, and fragment if present
        domain = domain.split(':')[0].split('?')[0].split('#')[0];
      }

      // Find the first-level domain (TLD)
      const domainParts = domain.split('.');
      if (domainParts.length < 2) {
        return { firstLevelDomain: { value: control.value, allowedDomains } };
      }

      const tld = '.' + domainParts[domainParts.length - 1];
      
      if (!allowedDomains.includes(tld)) {
        return { 
          firstLevelDomain: { 
            value: control.value, 
            foundDomain: tld,
            allowedDomains 
          } 
        };
      }

      return null; // Valid domain
    } catch (error) {
      return { 
        firstLevelDomain: { 
          value: control.value, 
          error: 'Invalid URL format',
          allowedDomains 
        } 
      };
    }
  };
}