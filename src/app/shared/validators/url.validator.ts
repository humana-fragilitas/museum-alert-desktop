import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';


export function urlValidator(): ValidatorFn {
  
  return (control: AbstractControl): ValidationErrors | null => {

    if (!control.value) {
      return null;
    }

    const value = control.value.toString();
    
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})(:\d+)?([\/\w \.-]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/i;
    
    if (!urlPattern.test(value)) {

      return { 
        url: { 
          value: control.value
        } 
      };

    }

    try {

      let urlToTest = value;
      
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        urlToTest = 'https://' + value;
      }
      
      const url = new URL(urlToTest);
      
      if (!url.hostname || url.hostname.length === 0) {

        return { 
          url: { 
            value: control.value
          } 
        };

      }

      if (!['http:', 'https:'].includes(url.protocol)) {

        return { 
          url: { 
            value: control.value
          } 
        };
        
      }

      return null;

    } catch (error) {

      return { 
        url: { 
          value: control.value
        } 
      };

    }
  };
}