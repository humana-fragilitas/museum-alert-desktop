import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { TranslatePipe } from '@ngx-translate/core';

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AmplifyAuthenticatorModule,
    TranslatePipe
  ],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {

  ngOnInit(): void {
    console.log('[HomeComponent] ngOnInit');
  }

}
 
