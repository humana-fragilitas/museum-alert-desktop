import { isDevMode } from '@angular/core';

export const titleStyle = 'background-color: darkblue; color: white; font-style: italic; padding: 0 10px; line-height: 2em; font-size: 1.5em;'

export function initializeConditionalConsole() {
    
  if (!isDevMode()) {
    // In production, only log if debug flag is set
    const originalConsole = { ...console };
    
    const shouldLog = () => {
      try {
        return localStorage.getItem('debug') === 'true';
      } catch {
        return false;
      }
    };

    // Override console methods globally
    console.log = (...args: any[]) => shouldLog() && originalConsole.log(...args);
    console.info = (...args: any[]) => shouldLog() && originalConsole.info(...args);
    console.warn = (...args: any[]) => shouldLog() && originalConsole.warn(...args);
    console.error = (...args: any[]) => shouldLog() && originalConsole.error(...args);
    console.debug = (...args: any[]) => shouldLog() && originalConsole.debug(...args);
  }
  // In development mode, console works normally
  
}