import { Injectable } from '@angular/core';
import { Hub } from '@aws-amplify/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RedirectService {

  constructor(private authService: AuthService, private router: Router) {

    this.authService.sessionData.subscribe((session) => {

      const redirectTarget = session ? ['/device'] : ['/index'];

      console.log(`Session ${session ? 'is valid' : 'expired' }: redirecting to ${redirectTarget[0]}`);

      this.router.navigate(redirectTarget);

    });

  }

}
