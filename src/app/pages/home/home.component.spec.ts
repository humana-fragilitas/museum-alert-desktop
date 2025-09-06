import { TranslateModule,
         TranslateService } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { HomeComponent } from './home.component';


describe('HomeComponent', () => {

  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        TranslateService
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render amplify-authenticator', () => {
    const auth = fixture.debugElement.query(By.css('amplify-authenticator'));
    expect(auth).toBeTruthy();
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('[HomeComponent] ngOnInit');
  });

});
