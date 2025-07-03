import { Injectable } from '@angular/core';
import { Hub } from '@aws-amplify/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RedirectService {

  constructor(private authService: AuthService, private router: Router) {

    this.authService.user$.subscribe((user) => {

      const redirectTarget = user ? ['/device'] : ['/index'];

      console.log(`Session ${user ? 'is valid' : 'expired' }: redirecting to ${redirectTarget[0]}`);

      // TO DO: remove this; it has been necessary to solve an error
      // in Amplify UI where a quick redirect (see AuthService.getUser())
      // causes an error in the library's cleanup procedures
      setTimeout(() => {
        this.router.navigate(redirectTarget);
      }, 2000)

    });

  }

}
