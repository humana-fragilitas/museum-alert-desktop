import { Component, EnvironmentInjector, inject } from '@angular/core';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {

  }
}
