import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom validator that checks if a string is a valid URL
 * Supports both http and https protocols
 */
export function urlValidator(): ValidatorFn {
  
  return (control: AbstractControl): ValidationErrors | null => {

    if (!control.value) {
      return null; // Don't validate empty values (use required validator for that)
    }

    const value = control.value.toString();
    
    // Basic URL pattern check first (for better performance)
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    
    if (!urlPattern.test(value)) {

      return { 
        url: { 
          value: control.value
        } 
      };

    }

    try {
      // Try to create URL object for more thorough validation
      let urlToTest = value;
      
      // Add protocol if missing
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        urlToTest = 'https://' + value;
      }
      
      const url = new URL(urlToTest);
      
      // Additional checks
      if (!url.hostname || url.hostname.length === 0) {

        return { 
          url: { 
            value: control.value
          } 
        };

      }

      // Check for valid protocol
      if (!['https:'].includes(url.protocol)) {

        return { 
          url: { 
            value: control.value
          } 
        };
        
      }

      return null; // Valid URL

    } catch (error) {

      return { 
        url: { 
          value: control.value
        } 
      };

    }
  };
}