import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { validateEddystoneUrl } from '@shared/helpers/eddystone-url.helper';

/**
 * Eddystone URL validator that checks if URL can be encoded within 18-byte limit
 * This should be imported from your eddystone-helpers file
 */
export function eddystoneUrlValidator(): ValidatorFn {

  return (control: AbstractControl): ValidationErrors | null => {

    if (!control.value) {
      return null;
    }

    const validation = validateEddystoneUrl(control.value);
    
    if (!validation.valid) {
      return { 
        eddystoneUrl: { 
          value: control.value,
          encodedLength: validation.encodedLength,
          maxLength: 18,
          error: validation.error
        }
      };
    }
    
    return null;
  };

}