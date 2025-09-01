// src/app/core/utils/console-override.spec.ts
import { isDevMode } from '@angular/core';

import { initializeConditionalConsole, titleStyle } from './console.helper';


jest.mock('@angular/core', () => ({
  isDevMode: jest.fn()
}));

describe('console.helper', () => {
  let mockIsDevMode: jest.MockedFunction<typeof isDevMode>;
  let originalConsole: Console;
  let callLog: Record<string, any[][]>;

  beforeEach(() => {
    originalConsole = { ...console };
    callLog = { log: [], info: [], warn: [], error: [], debug: [] };
    console.log = (...args: any[]) => callLog.log.push(args);
    console.info = (...args: any[]) => callLog.info.push(args);
    console.warn = (...args: any[]) => callLog.warn.push(args);
    console.error = (...args: any[]) => callLog.error.push(args);
    console.debug = (...args: any[]) => callLog.debug.push(args);
    mockIsDevMode = isDevMode as jest.MockedFunction<typeof isDevMode>;
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    localStorage.clear();
  });

  describe('titleStyle', () => {
    it('should export the correct CSS style string', () => {
      expect(titleStyle).toBe(
        'background-color: darkblue; color: white; font-style: italic; padding: 0 10px; line-height: 2em; font-size: 1.5em;'
      );
    });
  });

  describe('initializeConditionalConsole', () => {
    describe('development mode', () => {
      beforeEach(() => mockIsDevMode.mockReturnValue(true));
      it('does not override console methods', () => {
        initializeConditionalConsole();
        console.log('dev log');
        expect(callLog.log).toHaveLength(1);
        expect(callLog.log[0]).toEqual(['dev log']);
      });
      it('all console methods work in dev', () => {
        initializeConditionalConsole();
        console.log('log');
        console.info('info');
        console.warn('warn');
        console.error('error');
        console.debug('debug');
        expect(callLog.log[0]).toEqual(['log']);
        expect(callLog.info[0]).toEqual(['info']);
        expect(callLog.warn[0]).toEqual(['warn']);
        expect(callLog.error[0]).toEqual(['error']);
        expect(callLog.debug[0]).toEqual(['debug']);
      });
    });

    describe('production mode', () => {
      beforeEach(() => mockIsDevMode.mockReturnValue(false));

      describe('debug flag true', () => {
        beforeEach(() => localStorage.setItem('debug', 'true'));
        it('allows all console methods', () => {
          initializeConditionalConsole();
          console.log('log');
          console.info('info');
          console.warn('warn');
          console.error('error');
          console.debug('debug');
          expect(callLog.log[0]).toEqual(['log']);
          expect(callLog.info[0]).toEqual(['info']);
          expect(callLog.warn[0]).toEqual(['warn']);
          expect(callLog.error[0]).toEqual(['error']);
          expect(callLog.debug[0]).toEqual(['debug']);
        });
        it('handles multiple arguments', () => {
          initializeConditionalConsole();
          console.log('a', 1, { x: 2 });
          expect(callLog.log[0]).toEqual(['a', 1, { x: 2 }]);
        });
      });

      describe('debug flag false or unset', () => {
        it('suppresses all console methods if debug not set', () => {
          initializeConditionalConsole();
          console.log('no log');
          expect(callLog.log).toHaveLength(0);
        });
        it('suppresses all console methods if debug is false', () => {
          localStorage.setItem('debug', 'false');
          initializeConditionalConsole();
          console.log('no log');
          expect(callLog.log).toHaveLength(0);
        });
        it('suppresses all console methods for all types', () => {
          localStorage.setItem('debug', 'false');
          initializeConditionalConsole();
          console.log('log');
          console.info('info');
          console.warn('warn');
          console.error('error');
          console.debug('debug');
          expect(callLog.log).toHaveLength(0);
          expect(callLog.info).toHaveLength(0);
          expect(callLog.warn).toHaveLength(0);
          expect(callLog.error).toHaveLength(0);
          expect(callLog.debug).toHaveLength(0);
        });
      });

      describe('localStorage error', () => {
        it('handles localStorage.getItem error gracefully', () => {
          const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('fail'); });
          initializeConditionalConsole();
          expect(() => console.log('x')).not.toThrow();
          expect(callLog.log).toHaveLength(0);
          spy.mockRestore();
        });
      });

      describe('console override mechanics', () => {
        it('overrides all console methods', () => {
          const orig = { ...console };
          initializeConditionalConsole();
          expect(console.log).not.toBe(orig.log);
          expect(console.info).not.toBe(orig.info);
          expect(console.warn).not.toBe(orig.warn);
          expect(console.error).not.toBe(orig.error);
          expect(console.debug).not.toBe(orig.debug);
        });
        it('does not throw if suppressed', () => {
          localStorage.setItem('debug', 'false');
          initializeConditionalConsole();
          expect(() => console.log('x')).not.toThrow();
        });
        it('does not throw if enabled', () => {
          localStorage.setItem('debug', 'true');
          initializeConditionalConsole();
          expect(() => console.log('x')).not.toThrow();
        });
      });

      describe('edge cases', () => {
        it('debug value is case sensitive', () => {
          localStorage.setItem('debug', 'TRUE');
          initializeConditionalConsole();
          console.log('no log');
          expect(callLog.log).toHaveLength(0);
        });
        it('debug value is empty', () => {
          localStorage.setItem('debug', '');
          initializeConditionalConsole();
          console.log('no log');
          expect(callLog.log).toHaveLength(0);
        });
        it('debug value is null string', () => {
          localStorage.setItem('debug', 'null');
          initializeConditionalConsole();
          console.log('no log');
          expect(callLog.log).toHaveLength(0);
        });
        it('multiple initializations are safe', () => {
          localStorage.setItem('debug', 'true');
          initializeConditionalConsole();
          initializeConditionalConsole();
          console.log('log');
          expect(callLog.log).toHaveLength(1);
        });
        it('changing debug flag after init affects logging', () => {
          localStorage.setItem('debug', 'false');
          initializeConditionalConsole();
          console.log('no log');
          expect(callLog.log).toHaveLength(0);
          localStorage.setItem('debug', 'true');
          console.log('log');
          expect(callLog.log).toHaveLength(1);
        });
        it('call order is preserved', () => {
          localStorage.setItem('debug', 'true');
          initializeConditionalConsole();
          console.log('a');
          console.warn('b');
          console.log('c');
          expect(callLog.log).toEqual([['a'], ['c']]);
          expect(callLog.warn).toEqual([['b']]);
        });
      });
    });
  });
});