import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { urlValidator } from './url.validator';
import { firstLevelDomainValidator } from './first-level-domain.validator';
import { eddystoneUrlValidator } from './eddystone-encoded-url.validator';


/**
 * Combined validator that checks both URL validity and first-level domain
 * This is a convenience validator that combines both checks
 */
export function beaconUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    // First check if it's a valid URL
    const urlValidation = urlValidator()(control);
    if (urlValidation) {
      return urlValidation;
    }

    // Then check the domain
    const domainValidation = firstLevelDomainValidator()(control);
    if (domainValidation) {
      return domainValidation;
    }

    // Finally check if it can be encoded as Eddystone-URL
    const eddystoneValidation = eddystoneUrlValidator()(control);
    if (eddystoneValidation) {
      return eddystoneValidation;
    }

    return null; // All validations passed
  };
}
