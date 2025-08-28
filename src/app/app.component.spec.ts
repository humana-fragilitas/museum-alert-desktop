import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TranslateService, TranslateStore } from '@ngx-translate/core';
import { ElectronService } from '@services/electron/electron.service';
import { AuthService } from '@services/auth/auth.service';
import { APP_CONFIG } from '@env/environment';
import { NavBarComponent } from '@shared/components/nav-bar/nav-bar.component';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let mockTranslate: Partial<TranslateService>;
  let mockAuth: Partial<AuthService>;

  function createElectronMock(isElectron: boolean) {
    return {
      get isElectron() { return isElectron; },
      ipcRenderer: {
        // Add minimal required methods if needed
        on: jest.fn(),
        send: jest.fn()
      },
      childProcess: {
        // Add minimal required methods if needed
        spawn: jest.fn(),
        exec: jest.fn()
      }
    } as unknown as ElectronService;
  }

  beforeEach(async () => {
    mockTranslate = { setDefaultLang: jest.fn() };
    mockAuth = { user: signal(null) };
    await TestBed.configureTestingModule({
      imports: [AppComponent, CommonModule, RouterOutlet, NavBarComponent],
      providers: [
        { provide: ElectronService, useValue: createElectronMock(false) },
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

  it('should log electron info if running in electron', async () => {
    // Reconfigure TestBed for this specific test
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppComponent, CommonModule, RouterOutlet, NavBarComponent],
      providers: [
        { provide: ElectronService, useValue: createElectronMock(true) },
        { provide: TranslateService, useValue: mockTranslate },
        { provide: TranslateStore, useValue: {} },
        { provide: AuthService, useValue: mockAuth }
      ]
    }).compileComponents();
    
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    expect(logSpy).toHaveBeenCalledWith('Run in electron');
    expect(logSpy).toHaveBeenCalledWith('Electron ipcRenderer', expect.any(Object));
    expect(logSpy).toHaveBeenCalledWith('NodeJS childProcess', expect.any(Object));
    logSpy.mockRestore();
  });

  it('should log browser info if not running in electron', async () => {
    // Reconfigure TestBed for this specific test
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AppComponent, CommonModule, RouterOutlet, NavBarComponent],
      providers: [
        { provide: ElectronService, useValue: createElectronMock(false) },
        { provide: TranslateService, useValue: mockTranslate },
        { provide: TranslateStore, useValue: {} },
        { provide: AuthService, useValue: mockAuth }
      ]
    }).compileComponents();
    
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    expect(logSpy).toHaveBeenCalledWith('Run in browser');
    logSpy.mockRestore();
  });
});
