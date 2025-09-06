import { TranslateService,
         TranslateStore } from '@ngx-translate/core';

import { ComponentFixture,
         TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';

import { AuthService } from '@services/auth/auth.service';
import { APP_CONFIG } from '@env/environment';
import { NavBarComponent } from '@shared/components/nav-bar/nav-bar.component';
import { AppComponent } from './app.component';


describe('AppComponent', () => {
  
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let mockTranslate: Partial<TranslateService>;
  let mockAuth: Partial<AuthService>;

  beforeEach(async () => {
    mockTranslate = { setDefaultLang: jest.fn() };
    mockAuth = { user: signal(null) };
    await TestBed.configureTestingModule({
      imports: [AppComponent, CommonModule, RouterOutlet, NavBarComponent],
      providers: [
        { provide: TranslateService, useValue: mockTranslate },
        { provide: TranslateStore, useValue: {} },
        { provide: AuthService, useValue: mockAuth }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set default language to en', () => {
    expect(mockTranslate.setDefaultLang).toHaveBeenCalledWith('en');
  });

  it('should expose user signal from AuthService', () => {
    expect(component.user).toBe(mockAuth.user);
  });

  it('should log APP_CONFIG and environment info', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    expect(logSpy).toHaveBeenCalledWith('APP_CONFIG', APP_CONFIG);
    logSpy.mockRestore();
  });

});
