// src/app/core/utils/console-override.spec.ts
import { isDevMode } from '@angular/core';
import { initializeConditionalConsole, titleStyle } from './console.helper';

// Mock Angular's isDevMode function
jest.mock('@angular/core', () => ({
  isDevMode: jest.fn()
}));

describe('console.helper', () => {
  let mockIsDevMode: jest.MockedFunction<typeof isDevMode>;
  let originalConsole: Console;
  let capturedCalls: {
    log: any[][];
    info: any[][];
    warn: any[][];
    error: any[][];
    debug: any[][];
  };

  beforeEach(() => {
    // Store the original console
    originalConsole = { ...console };
    
    // Initialize call capture
    capturedCalls = {
      log: [],
      info: [],
      warn: [],
      error: [],
      debug: []
    };
    
    // Replace console methods with call capturers
    console.log = (...args: any[]) => capturedCalls.log.push(args);
    console.info = (...args: any[]) => capturedCalls.info.push(args);
    console.warn = (...args: any[]) => capturedCalls.warn.push(args);
    console.error = (...args: any[]) => capturedCalls.error.push(args);
    console.debug = (...args: any[]) => capturedCalls.debug.push(args);
    
    // Get the mocked isDevMode function
    mockIsDevMode = isDevMode as jest.MockedFunction<typeof isDevMode>;
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    // Restore original console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    
    // Clear localStorage
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
    describe('in development mode', () => {
      beforeEach(() => {
        mockIsDevMode.mockReturnValue(true);
      });

      it('should not override console methods when in development mode', () => {
        initializeConditionalConsole();
        
        console.log('test message');
        
        expect(capturedCalls.log).toHaveLength(1);
        expect(capturedCalls.log[0]).toEqual(['test message']);
      });

      it('should allow all console methods to work normally in development mode', () => {
        initializeConditionalConsole();
        
        console.log('log message');
        console.info('info message');
        console.warn('warn message');
        console.error('error message');
        console.debug('debug message');
        
        expect(capturedCalls.log).toHaveLength(1);
        expect(capturedCalls.log[0]).toEqual(['log message']);
        expect(capturedCalls.info).toHaveLength(1);
        expect(capturedCalls.info[0]).toEqual(['info message']);
        expect(capturedCalls.warn).toHaveLength(1);
        expect(capturedCalls.warn[0]).toEqual(['warn message']);
        expect(capturedCalls.error).toHaveLength(1);
        expect(capturedCalls.error[0]).toEqual(['error message']);
        expect(capturedCalls.debug).toHaveLength(1);
        expect(capturedCalls.debug[0]).toEqual(['debug message']);
      });
    });

    describe('in production mode', () => {
      beforeEach(() => {
        mockIsDevMode.mockReturnValue(false);
      });

      describe('when debug flag is set to true', () => {
        beforeEach(() => {
          localStorage.setItem('debug', 'true');
        });

        it('should allow console.log when debug flag is true', () => {
          initializeConditionalConsole();
          
          console.log('test message');
          
          expect(capturedCalls.log).toHaveLength(1);
          expect(capturedCalls.log[0]).toEqual(['test message']);
        });

        it('should allow all console methods when debug flag is true', () => {
          initializeConditionalConsole();
          
          console.log('log message');
          console.info('info message');
          console.warn('warn message');
          console.error('error message');
          console.debug('debug message');
          
          expect(capturedCalls.log).toHaveLength(1);
          expect(capturedCalls.log[0]).toEqual(['log message']);
          expect(capturedCalls.info).toHaveLength(1);
          expect(capturedCalls.info[0]).toEqual(['info message']);
          expect(capturedCalls.warn).toHaveLength(1);
          expect(capturedCalls.warn[0]).toEqual(['warn message']);
          expect(capturedCalls.error).toHaveLength(1);
          expect(capturedCalls.error[0]).toEqual(['error message']);
          expect(capturedCalls.debug).toHaveLength(1);
          expect(capturedCalls.debug[0]).toEqual(['debug message']);
        });

        it('should handle multiple arguments correctly when debug is enabled', () => {
          initializeConditionalConsole();
          
          console.log('message', 123, { key: 'value' }, ['array']);
          
          expect(capturedCalls.log).toHaveLength(1);
          expect(capturedCalls.log[0]).toEqual(['message', 123, { key: 'value' }, ['array']]);
        });
      });

      describe('when debug flag is not set or false', () => {
        it('should not call console methods when debug flag is not set', () => {
          initializeConditionalConsole();
          
          console.log('test message');
          
          expect(capturedCalls.log).toHaveLength(0);
        });

        it('should not call console methods when debug flag is false', () => {
          localStorage.setItem('debug', 'false');
          
          initializeConditionalConsole();
          
          console.log('test message');
          
          expect(capturedCalls.log).toHaveLength(0);
        });

        it('should not call any console methods when debug flag is false', () => {
          localStorage.setItem('debug', 'false');
          
          initializeConditionalConsole();
          
          console.log('log message');
          console.info('info message');
          console.warn('warn message');
          console.error('error message');
          console.debug('debug message');
          
          expect(capturedCalls.log).toHaveLength(0);
          expect(capturedCalls.info).toHaveLength(0);
          expect(capturedCalls.warn).toHaveLength(0);
          expect(capturedCalls.error).toHaveLength(0);
          expect(capturedCalls.debug).toHaveLength(0);
        });

        it('should not call original methods with multiple arguments when debug is disabled', () => {
          localStorage.setItem('debug', 'false');
          
          initializeConditionalConsole();
          
          console.log('message', 123, { key: 'value' }, ['array']);
          
          expect(capturedCalls.log).toHaveLength(0);
        });
      });

      describe('localStorage error handling', () => {
        it('should handle localStorage errors gracefully and default to no logging', () => {
          // Mock localStorage.getItem to throw an error
          const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => {
              throw new Error('localStorage error');
            });
          
          initializeConditionalConsole();
          
          console.log('test message');
          
          expect(capturedCalls.log).toHaveLength(0);
          expect(getItemSpy).toHaveBeenCalledWith('debug');
          
          getItemSpy.mockRestore();
        });
      });

      describe('console method overrides', () => {
        it('should properly override console.log method', () => {
          const originalLogMethod = console.log;
          
          initializeConditionalConsole();
          
          expect(console.log).not.toBe(originalLogMethod);
          expect(typeof console.log).toBe('function');
        });

        it('should properly override all console methods', () => {
          const originalMethods = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
          };
          
          initializeConditionalConsole();
          
          expect(console.log).not.toBe(originalMethods.log);
          expect(console.info).not.toBe(originalMethods.info);
          expect(console.warn).not.toBe(originalMethods.warn);
          expect(console.error).not.toBe(originalMethods.error);
          expect(console.debug).not.toBe(originalMethods.debug);
        });

        it('should preserve console method functionality when debug is true', () => {
          localStorage.setItem('debug', 'true');
          
          initializeConditionalConsole();
          
          // Test that overridden methods still work
          expect(() => console.log('test')).not.toThrow();
          expect(() => console.info('test')).not.toThrow();
          expect(() => console.warn('test')).not.toThrow();
          expect(() => console.error('test')).not.toThrow();
          expect(() => console.debug('test')).not.toThrow();
          
          // Verify that all methods were called
          expect(capturedCalls.log).toHaveLength(1);
          expect(capturedCalls.info).toHaveLength(1);
          expect(capturedCalls.warn).toHaveLength(1);
          expect(capturedCalls.error).toHaveLength(1);
          expect(capturedCalls.debug).toHaveLength(1);
        });

        it('should not throw errors when debug is false', () => {
          localStorage.setItem('debug', 'false');
          
          initializeConditionalConsole();
          
          // Test that overridden methods don't throw even when suppressed
          expect(() => console.log('test')).not.toThrow();
          expect(() => console.info('test')).not.toThrow();
          expect(() => console.warn('test')).not.toThrow();
          expect(() => console.error('test')).not.toThrow();
          expect(() => console.debug('test')).not.toThrow();
          
          // Verify that no methods were called
          expect(capturedCalls.log).toHaveLength(0);
          expect(capturedCalls.info).toHaveLength(0);
          expect(capturedCalls.warn).toHaveLength(0);
          expect(capturedCalls.error).toHaveLength(0);
          expect(capturedCalls.debug).toHaveLength(0);
        });
      });

      describe('edge cases', () => {
        it('should handle localStorage debug value case sensitivity', () => {
          localStorage.setItem('debug', 'TRUE');
          
          initializeConditionalConsole();
          
          console.log('test message');
          
          // Should not call console since 'TRUE' !== 'true'
          expect(capturedCalls.log).toHaveLength(0);
        });

        it('should handle empty debug value', () => {
          localStorage.setItem('debug', '');
          
          initializeConditionalConsole();
          
          console.log('test message');
          
          expect(capturedCalls.log).toHaveLength(0);
        });

        it('should handle null debug value', () => {
          localStorage.setItem('debug', 'null');
          
          initializeConditionalConsole();
          
          console.log('test message');
          
          expect(capturedCalls.log).toHaveLength(0);
        });

        it('should work correctly when called multiple times', () => {
          localStorage.setItem('debug', 'true');
          
          // Call initialization multiple times
          initializeConditionalConsole();
          initializeConditionalConsole();
          initializeConditionalConsole();
          
          console.log('test message');
          
          // Should still work correctly
          expect(capturedCalls.log).toHaveLength(1);
          expect(capturedCalls.log[0]).toEqual(['test message']);
        });

        it('should handle changing debug flag after initialization', () => {
          localStorage.setItem('debug', 'false');
          
          initializeConditionalConsole();
          
          console.log('first message');
          expect(capturedCalls.log).toHaveLength(0);
          
          // Change debug flag
          localStorage.setItem('debug', 'true');
          
          console.log('second message');
          
          // Should now log because shouldLog() checks localStorage each time
          expect(capturedCalls.log).toHaveLength(1);
          expect(capturedCalls.log[0]).toEqual(['second message']);
        });

        it('should handle undefined localStorage values', () => {
          // Don't set any debug value
          initializeConditionalConsole();
          
          console.log('test message');
          
          expect(capturedCalls.log).toHaveLength(0);
        });

        it('should maintain call order for mixed console methods', () => {
          localStorage.setItem('debug', 'true');
          
          initializeConditionalConsole();
          
          console.log('first');
          console.warn('second');
          console.log('third');
          
          expect(capturedCalls.log).toHaveLength(2);
          expect(capturedCalls.warn).toHaveLength(1);
          expect(capturedCalls.log[0]).toEqual(['first']);
          expect(capturedCalls.warn[0]).toEqual(['second']);
          expect(capturedCalls.log[1]).toEqual(['third']);
        });
      });
    });
  });
});