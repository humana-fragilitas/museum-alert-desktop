import {
  BrowserContext,
  ElectronApplication,
  Page,
  _electron as electron
} from 'playwright';
import { test, expect } from '@playwright/test';

import * as PATH from 'path';


test.describe('Check Default Route', () => {
  
  let app: ElectronApplication;
  let firstWindow: Page;
  let context: BrowserContext;

  test.beforeAll( async () => {
    app = await electron.launch({ args: [PATH.join(__dirname, '../app/main.js'), PATH.join(__dirname, '../app/package.json')] });
    context = app.context();
    await context.tracing.start({ screenshots: true, snapshots: true });
    firstWindow = await app.firstWindow();
    await firstWindow.waitForLoadState('domcontentloaded');
  });

  test('Launch electron app', async () => {

    const windowState: { isVisible: boolean; isDevToolsOpened: boolean; isCrashed: boolean } = await app.evaluate(async (process) => {
      const mainWindow = process.BrowserWindow.getAllWindows()[0];

      const getState = () => ({
        isVisible: mainWindow.isVisible(),
        isDevToolsOpened: mainWindow.webContents.isDevToolsOpened(),
        isCrashed: mainWindow.webContents.isCrashed(),
      });

      return new Promise((resolve) => {
        if (mainWindow.isVisible()) {
          resolve(getState());
        } else {
          mainWindow.once('ready-to-show', () => setTimeout(() => resolve(getState()), 0));
        }
      });
    });

    expect(windowState.isVisible).toBeTruthy();
    expect(windowState.isDevToolsOpened).toBeFalsy();
    expect(windowState.isCrashed).toBeFalsy();
  });

  test('Check Museum Alert logo is present', async () => {
    const logoElement = await firstWindow.$('.logo');
    expect(logoElement).toBeTruthy();
    
    const logoSrc = await logoElement?.getAttribute('src');
    expect(logoSrc).toBe('assets/images/museum_alert_logo.svg');
  });

  test('Check AmplifyUI authenticator is present', async () => {
    await firstWindow.waitForSelector('amplify-authenticator', { timeout: 10000 });
    const authenticatorElement = await firstWindow.$('amplify-authenticator');
    expect(authenticatorElement).toBeTruthy();
  });

  test('Check login form elements are present', async () => {
    const emailInput = await firstWindow.$('input[type="email"], input[name="email"], input[autocomplete="username"]');
    expect(emailInput).toBeTruthy();
    const passwordInput = await firstWindow.$('input[type="password"], input[name="password"], input[autocomplete="current-password"]');
    expect(passwordInput).toBeTruthy();
    const signInButton = await firstWindow.$('button[data-amplify-auth-signin], button:has-text("Sign in"), amplify-button[type="submit"]');
    expect(signInButton).toBeTruthy();
  });

  test('Check copyright footer is present', async () => {
    const footerElement = await firstWindow.$('ng-template[amplifyslot="footer"], .amplify-text');
    expect(footerElement).toBeTruthy();
  });

  test.afterAll( async () => {
    await context.tracing.stop({ path: 'e2e/tracing/trace.zip' });
    await app.close();
  });

});
