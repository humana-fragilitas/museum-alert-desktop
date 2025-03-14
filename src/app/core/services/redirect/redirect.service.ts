import { Injectable } from '@angular/core';
import { Hub } from '@aws-amplify/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RedirectService {

  constructor(private router: Router) {

    Hub.listen('auth', ({ payload }) => {

      switch (payload.event) {

        case 'signedIn':
          console.log('Redirecting user to device page...');
          this.router.navigate(['/device']);
          break;
        case 'signedOut':
        case 'tokenRefresh_failure':
          console.log('Redirecting user to index page...');
          this.router.navigate(['/index']);
          break;

      }

    });

  }

}
