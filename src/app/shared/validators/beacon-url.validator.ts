import { AbstractControl,
         ValidationErrors,
         ValidatorFn } from '@angular/forms';

import { urlValidator } from './url.validator';
import { firstLevelDomainValidator } from './first-level-domain.validator';
import { eddystoneUrlValidator } from './eddystone-encoded-url.validator';


export function beaconUrlValidator(): ValidatorFn {
  
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const urlValidation = urlValidator()(control);
    if (urlValidation) {
      return urlValidation;
    }

    const domainValidation = firstLevelDomainValidator()(control);
    if (domainValidation) {
      return domainValidation;
    }

    const eddystoneValidation = eddystoneUrlValidator()(control);
    if (eddystoneValidation) {
      return eddystoneValidation;
    }

    return null;
  
  };

}
